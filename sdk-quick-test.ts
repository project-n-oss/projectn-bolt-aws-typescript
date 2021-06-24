import { BoltS3Client } from "./BoltS3Client";

const { S3Client } = require("@aws-sdk/client-s3");

import { ListBucketsCommand } from "@aws-sdk/client-s3";

process.env.BOLT_URL = "bolt.us-east-2.projectn.us-east-2.bolt.projectn.co";

const boltS3Client = new BoltS3Client();
const s3Client = new S3Client();
const command = new ListBucketsCommand({});
(async function () {
  try {
    const boltS3Response = await boltS3Client.send(command);
    const s3Response = await s3Client.send(command);
    console.log(`BoltS3Client - Buckets count: ${boltS3Response.Buckets.length}`);
    console.log(`S3Client - Buckets count: ${s3Response.Buckets.length}`);
  } catch (err) {
    console.error(err);
  }
})();
