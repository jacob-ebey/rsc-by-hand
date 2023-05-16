// Represents the bundled "use client" module for the SSR bundle.

import * as React from "react";

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
