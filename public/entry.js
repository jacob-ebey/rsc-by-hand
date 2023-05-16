import * as React from "https://esm.sh/react@0.0.0-experimental-4cd706566-20230512";
import * as ReactDOM from "https://esm.sh/react-dom@0.0.0-experimental-4cd706566-20230512/client";
import { createFromReadableStream } from "https://esm.sh/react-server-dom-webpack@0.0.0-experimental-4cd706566-20230512/client";

// Polyfill the webpack runtime as we are using the webpack runtime
// reference implementation provided by react-server-dom-webpack.
// This is responsible for mapping the "holes" back to real components.
const clientModules = new Map();
window.__webpack_chunk_load__ = (mod) => {
  if (clientModules.has(mod)) {
    return clientModules.get(mod);
  }

  const modPromise = import(mod).then((m) => {
    clientModules.set(mod, m);
  });
  clientModules.set(mod, modPromise);
  return modPromise;
};
window.__webpack_require__ = (mod) => {
  return clientModules.get(mod);
};

React.startTransition(() => {
  // Create the vDOM from the RSC DOM representation.
  const vDOM = createFromReadableStream(window.__RSC_STREAM__);

  // Hydrate the document.
  ReactDOM.hydrateRoot(
    document,
    React.createElement(React.StrictMode, null, vDOM)
  );
});
