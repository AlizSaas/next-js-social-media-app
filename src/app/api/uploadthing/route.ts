import { createRouteHandler } from "uploadthing/next";
import { fileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: fileRouter,
}); // Export the GET and POST handlers for the Uploadthing API route