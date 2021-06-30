import { S3Client as S3ClientType, S3ClientConfig } from "@aws-sdk/client-s3";

const { S3Client } = require("@aws-sdk/client-s3");

import AWS from 'aws-sdk/global';

const aws4 = require("./aws4");

const axios = require("axios");

/*  
    Async default credentials are going to be loaded from file system into send method (when called for first time)
*/
// (async function () {
//     defaultCredentials = await fromIni({ profile: "default" })();
// })();

function isValidUrl(strUrl) {
  try {
    new URL(strUrl);
  } catch (e) {
    return false;
  }
  return true;
}

function getUrlHostname(strUrl: string) {
  return new URL(strUrl).hostname;
}

function getBoltHostname(region: string) {
  let boltURL = process.env.BOLT_URL;
  if (!boltURL) {
    throw new Error(
      "Bolt URL could not be found.\nPlease expose env var BOLT_URL"
    );
  }
  boltURL = boltURL.replace(new RegExp('{region}', 'g'), region);
  if (!isValidUrl(boltURL)) {
    throw new Error("Bolt URL is not valid. Please verify");
  }
  return getUrlHostname(boltURL);
}

/**
 * To get the region from EC2 instance in which Bolt is running
 * Every EC2 instance has associated metadata, which AWS makes available to all users & applications inside the instance. The instance ID, region and so are part of the metadata.
 */
async function getBoltRegion() {
  /* 
    Fetching info from AWS (SDK) metadata service is not efficient in terms of bundle size since that NPM package minification itself morethan 6.5 MB, so here we're going with other well known approach
  */
  // const response = await new Promise(function (fulfilled, rejected) {
  //   new AWS.MetadataService().request("region", (error, data) =>
  //     fulfilled(data)
  //   );
  // });

  if (process.env.AWS_REGION) {
    return process.env.AWS_REGION;
  }

  try {
    const response = await axios.get(
      "http://169.254.169.254/latest/dynamic/instance-identity/document"
    );
    if (response.data && response.data.region) {
      return response.data.region;
    } else {
      return new Error("Error in fetching Bolt's region.");
    }
  } catch (err) {
    return new Error(err);
  }
}

export class BoltS3Client extends S3Client {
  constructor(configuration: S3ClientConfig = {}) {
    configuration.forcePathStyle = true;
    super(configuration);
    this.credentials = configuration.credentials;
    this.IsMiddlwareStackUpdated = false;
  }

  // TODO: (MP) Add type definitions
  async send(...args) {
    if (!this.credentials) {
      const chain = new AWS.CredentialProviderChain();
      this.credentials = await chain.resolvePromise();
    }
    if (!this.credentials) return new Error("AWS credentials are required!");
    if (!this.IsMiddlwareStackUpdated) {
      this.region = await getBoltRegion();
      this.hostname = getBoltHostname(this.region);
      this.updateMiddlewareStack();
      this.IsMiddlwareStackUpdated = true;
    }
    return super.send(...args);
  }

  updateMiddlewareStack() {
    this.middlewareStack.add(
      (next, context) => (args) => {
        const serviceName = "sts";
        const stsUrlHostname = "sts.amazonaws.com";
        const options = {
          method: "POST",
          host: stsUrlHostname,
          body: "Action=GetCallerIdentity&Version=2011-06-15",
          service: serviceName,
          region: this.region,
        };
        aws4.sign(options, this.credentials);
        args.request.hostname = this.hostname;
        const signedHeaders = options["headers"] || {};
        args.request.headers = {};
        args.request.headers["X-Amz-Date"] = signedHeaders["X-Amz-Date"];
        args.request.headers["Authorization"] = signedHeaders[
          "Authorization"
        ].replace("content-length;content-type;", "");
        if(this.credentials.sessionToken) {
          args.request.headers["X-Amz-Security-Token"] = this.credentials.sessionToken;
        }
        return next(args);
      },
      {
        step: "finalizeRequest",
      }
    );
  }
}
