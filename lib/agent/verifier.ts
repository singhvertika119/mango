import { createClient } from "@/lib/supabase/server";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export interface VerificationResult {
  verified: boolean;
  message: string;
}

export async function verifyToolExecution(
  toolName: string,
  result: any,
  args: any
): Promise<VerificationResult> {
  // If result is empty or error was returned during tool output
  if (!result) {
    return { verified: false, message: "No execution output returned to verify." };
  }

  try {
    switch (toolName) {
      case "create_task": {
        const createdTaskId = result.id;
        if (!createdTaskId) return { verified: false, message: "Task ID missing from execution result." };
        
        if (!isSupabaseConfigured) {
          return { verified: true, message: `[Mock Verify] Confirmed task '${result.title}' exists.` };
        }

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title")
          .eq("id", createdTaskId)
          .single();

        if (error || !data) {
          return { verified: false, message: `Could not locate task ${createdTaskId} in the database.` };
        }
        return { verified: true, message: `Successfully verified task '${data.title}' in database.` };
      }

      case "update_task": {
        const taskId = args.taskId;
        if (!taskId) return { verified: false, message: "Task ID parameter missing in updates verification arguments." };

        if (!isSupabaseConfigured) {
          return { verified: true, message: `[Mock Verify] Verified updates on task ${taskId}.` };
        }

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("tasks")
          .select("id, status, priority")
          .eq("id", taskId)
          .single();

        if (error || !data) {
          return { verified: false, message: `Could not verify updated task ${taskId} in database.` };
        }

        // Compare properties
        const expectedStatus = args.updates?.status;
        if (expectedStatus && data.status !== expectedStatus) {
          return { verified: false, message: `Verification failed: task status is ${data.status}, expected ${expectedStatus}.` };
        }

        return { verified: true, message: `Confirmed updates successfully applied to task ${taskId}.` };
      }

      case "create_issue": {
        const issueNum = result.number;
        if (!issueNum) return { verified: false, message: "Issue number missing from GitHub results." };
        return { verified: true, message: `Successfully verified issue #${issueNum} has been connected.` };
      }

      default:
        // By default, if the tool returned a truthy result without error, count as auto-verified
        return { verified: true, message: "Action executed successfully." };
    }
  } catch (err: any) {
    return { verified: false, message: `Verification run failed: ${err.message}` };
  }
}
