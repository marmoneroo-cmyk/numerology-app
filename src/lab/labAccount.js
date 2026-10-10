/** Development only: the lab's sample admin, over the same in-memory sample clients as the public demo. */
import { memoryClient } from "../demo/sampleData.js";
import { sampleService } from "../demo/sampleAccount.js";

export { memoryClient as labClient } from "../demo/sampleData.js";

export const LAB_PROFILE = {
  id: "lab-user",
  email: "lab@example.com",
  fullName: "סטודיו לדוגמה",
  phone: "050-0000000",
  role: "admin",
  plan: "pro",
  deviceLimit: 2,
};

/** The account service of the sample admin. */
export const labService = (client = memoryClient()) => sampleService(client, LAB_PROFILE);
