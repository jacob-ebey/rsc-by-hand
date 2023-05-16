import * as http from "node:http";
import * as path from "node:path";
import * as stream from "node:stream";
import express from "express";

import { renderToPipeableStream } from "react-dom/server";
import { createFromNodeStream } from "react-server-dom-webpack/client";

// This is responsible for mapping the "holes" back to real components.
const manifest = {
  "/browser-counter.js": {
    Counter: {
      specifier: path.resolve(process.cwd(), "./ssr-counter.js"),
      name: "Counter",
    },
  },
};

const app = express();

app.use(express.static("public"));

app.get("*", (req, res) => {
  // Make a request for the RSC DOM representation.
  http.get("http://localhost:3001", (rscRes) => {
    // Create a transform stream responsible for serializing the RSC
    // representation to the HTML response for hydration in the browser
    // without subsequent network activity.
    const rscTransform = new RSCTransform(rscRes);

    // Create a vDOM from the RSC DOM representation.
    const vDOM = createFromNodeStream(rscRes, manifest);

    let didError = false;
    const ssrStream = renderToPipeableStream(vDOM, {
      // This is the bootstrap script for the transform stream
      // to serialize the RSC representation into.
      bootstrapScriptContent: `
        window.__RSC_ENCODER__ = new TextEncoder();
        window.__RSC_STREAM__ = new ReadableStream({
          start(controller) {
            window.__RSC_CONTROLLER__ = controller;
          },
        });
      `,
      bootstrapModules: ["/entry.js"],
      onShellReady() {
        res.writeHead(didError ? 500 : 200, {
          "Content-Type": "text/html",
        });
        rscTransform.pipe(res, { end: true });
        ssrStream.pipe(rscTransform);
      },
      onShellError() {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html");
        res.end(`<h1>Something went wrong</h1>`);
      },
      onError(error) {
        didError = true;
        console.error(error);
      },
    });
  });
});

app.listen(3000, () => {
  console.log("SSR server started at http://localhost:3000");
});

class RSCTransform extends stream.Transform {
  /**
   * @param {stream.Readable} rscStream
   */
  constructor(rscStream) {
    const decoder = new TextDecoder();
    let bufferedHTML = "";
    let foundBootstrap = false;

    // Decode and buffer the RSC stream for later flushing.
    let bufferedRSC = "";
    rscStream.on("data", (chunk) => {
      bufferedRSC += chunk.toString();
    });
    let rscResolve, rscReject;
    const rscClosedPromise = new Promise((resolve, reject) => {
      rscResolve = resolve;
      rscReject = reject;
    });
    rscStream.once("end", rscResolve);
    rscStream.once("error", rscReject);

    const flushRSCChunks = () => {
      let eol = bufferedRSC.indexOf("\n");
      while (eol !== -1) {
        const line = bufferedRSC.slice(0, eol + 1);
        this.push(
          Buffer.from(
            `<script>__RSC_CONTROLLER__.enqueue(__RSC_ENCODER__.encode(${JSON.stringify(
              line
            )}));</script>`
          )
        );
        bufferedRSC = bufferedRSC.slice(eol + 1);
        eol = bufferedRSC.indexOf("\n");
      }
    };

    super({
      transform(chunk, _, callback) {
        callback(null, chunk);

        const html = decoder.decode(chunk, { stream: true });
        bufferedHTML += html;

        // Make sure we have the bootstrap script before we flush the RSC chunks.
        if (!foundBootstrap && bufferedHTML.match(/window\.__RSC_STREAM__/g)) {
          foundBootstrap = true;
        }

        // Make sure we are not in the middle of writing a tag before we flush the RSC chunks.
        if (foundBootstrap && bufferedHTML.match(/((<\/)\w+(>))$/)) {
          flushRSCChunks();
          bufferedHTML = "";
        }
      },
      final(callback) {
        // Wait for the RSC stream to finish and flush remaining chunks.
        rscClosedPromise.then(() => {
          flushRSCChunks();
          callback();
        }, callback);
      },
    });
  }
}
