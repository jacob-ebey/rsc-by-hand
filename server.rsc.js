import express from "express";

import * as React from "react";
import { renderToPipeableStream } from "react-server-dom-webpack/server";

// This is the "hole" information that is serialized in the RSC DOM representation.
const manifest = {
  "client-counter": {
    id: "/browser-counter.js",
    chunks: ["/browser-counter.js"],
    name: "Counter",
  },
};

// This is a "hole". It represents a "use client" import that is filled in
// by a client (SSR or Browser hydration).
const CounterHole = {
  $$typeof: Symbol.for("react.client.reference"),
  $$id: "client-counter",
  $$async: true,
};

function App() {
  return React.createElement(
    "html",
    null,
    React.createElement(
      "body",
      null,
      React.createElement(
        "h1",
        null,
        "Hello world from React Server Components!"
      ),
      React.createElement(CounterHole, { initialValue: 2 })
    )
  );
}

const app = express();

app.get("*", (req, res) => {
  const rscStream = renderToPipeableStream(React.createElement(App), manifest);
  rscStream.pipe(res);
});

app.listen(3001, () => {
  console.log("RSC server started at http://localhost:3001");
});
