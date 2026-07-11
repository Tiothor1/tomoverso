"use node";

import * as http from "http";

http.globalAgent.maxHeaderSize = 65536;
console.log("maxHeaderSize:", http.globalAgent.maxHeaderSize);

http.get(
  "http://ccmixter.org/api/query?datasource=tracks&f=json&search=lofi&limit=1",
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      const data = JSON.parse(body);
      console.log("Results:", data.length);
      if (data.length > 0) {
        console.log("First:", data[0].upload_name);
      }
    });
  }
).on("error", (e) => console.log("ERR:", e.message));
