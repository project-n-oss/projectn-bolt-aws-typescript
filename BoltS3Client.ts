import { S3Client as S3ClientType, S3ClientConfig } from "@aws-sdk/client-s3";

const { S3Client } = require("@aws-sdk/client-s3");

const { fromIni } = require("@aws-sdk/credential-provider-ini");

const aws4 = require("./aws4");


/*  
    Async default credentials are going to be loaded from file system into send method (when called for first time)
*/
// (async function () {
//     defaultCredentials = await fromIni({ profile: "default" })();
// })();


export class BoltS3Client extends S3Client {
    savedCredentials
  IsMiddlwareStackUpdated = false;
  constructor(configuration: S3ClientConfig = {}) {
    super(configuration);
    this.savedCredentials = configuration.credentials;
    this.IsMiddlwareStackUpdated = false;
  }

  // TODO: Add type definitions
  async send(...args) {
    if (!this.savedCredentials) {
        this.savedCredentials = await fromIni({ profile: "default" })();
    }
    const credentials = this.savedCredentials;
    if (!credentials) return new Error("AWS credentials are required!");
    if (!this.IsMiddlwareStackUpdated) {
      this.UpdateMiddlewareStack(credentials);
    }
    return super.send(...args);
  }

  UpdateMiddlewareStack(credentials) {
    this.middlewareStack.add(
      (next, context) => (args) => {
        const regionName = "us-east-1";
        const serviceName = "sts";
        const stsUrlHostname = "sts.amazonaws.com";
        const options = {
          method: "POST",
          host: stsUrlHostname,
          body: "Action=GetCallerIdentity&Version=2011-06-15",
          service: serviceName,
          region: regionName,
        };
        aws4.sign(options, credentials);
        const boltURL = process.env.BOLT_URL; // TODO: This should be generic, needs to be updated for browser (works for node js for now)
        if (!boltURL)
          new Error(
            "Bolt URL could not be found.\nPlease expose env var BOLT_URL"
          );
        args.request.hostname = boltURL;
        const signedHeaders = options["headers"] || {};
        args.request.headers = {};
        args.request.headers["X-Amz-Date"] = signedHeaders["X-Amz-Date"];
        args.request.headers["Authorization"] = signedHeaders[
          "Authorization"
        ].replace("content-length;content-type;", "");
        return next(args);
      },
      {
        step: "finalizeRequest",
      }
    );
    this.IsMiddlwareStackUpdated = true;
  }
}
