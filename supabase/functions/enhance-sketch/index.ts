import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

console.log("FemmeFatale enhance-sketch function loaded.");

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json(
          {
            error: "Method not allowed.",
          },
          {
            status: 405,
          },
        );
      }

      try {
        const body = await req.json();

        const imageData =
          typeof body?.imageData === "string"
            ? body.imageData.trim()
            : "";

        if (!imageData) {
          return Response.json(
            {
              error: "imageData is required.",
            },
            {
              status: 400,
            },
          );
        }

        console.log(
          "Enhance request received for user:",
          ctx.userClaims?.sub ?? "unknown",
        );

        return Response.json({
          success: false,
          aiConnected: false,
          message:
            "Sketch received successfully. AI image enhancement is not connected yet.",
        });
      } catch (error) {
        console.error("ENHANCE SKETCH ERROR:", error);

        return Response.json(
          {
            error: "Invalid enhancement request.",
          },
          {
            status: 400,
          },
        );
      }
    },
  ),
};
