// Represents the bundled "use client" module for the browser bundle.

import * as React from "https://esm.sh/react@0.0.0-experimental-4cd706566-20230512";

export function Counter() {
  const [count, setCount] = React.useState(0);

  return React.createElement(
    "div",
    null,
    React.createElement("p", null, `Count: ${count}`),
    React.createElement(
      "button",
      {
        onClick() {
          setCount((c) => c + 1);
        },
      },
      "Increment"
    )
  );
}
