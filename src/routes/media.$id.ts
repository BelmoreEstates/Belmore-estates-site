import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

/** Serves small images uploaded from /admin (stored base64 in the `media` table). */
export const Route = createFileRoute("/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = Number(params.id);
        if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
        const sql = await getSql();
        const [row] = await sql<{
          mime: string;
          data: string;
        }>`select mime, data from media where id = ${id}`;
        if (!row) return new Response("Not found", { status: 404 });
        return new Response(Buffer.from(row.data, "base64"), {
          headers: {
            "content-type": row.mime,
            "cache-control": "public, max-age=86400",
            "x-content-type-options": "nosniff",
            "content-security-policy": "default-src 'none'; sandbox",
          },
        });
      },
    },
  },
});
