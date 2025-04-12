import React from "react";

export const Input = (props) => (
  <input
    {...props}
    className={`border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 ${props.className || ""}`}
  />
);
