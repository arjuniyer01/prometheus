import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { analyzeTicker } from "../../../inngest/functions";

// Create an API that serves zero-delay functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        analyzeTicker,
    ],
});
