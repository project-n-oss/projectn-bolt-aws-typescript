"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoltS3Client = void 0;
const { S3Client } = require("@aws-sdk/client-s3");
const { fromIni } = require("@aws-sdk/credential-provider-ini");
const aws4 = require("./aws4");
/*
    Async default credentials are going to be loaded from file system into send method (when called for first time)
*/
// (async function () {
//     defaultCredentials = await fromIni({ profile: "default" })();
// })();
class BoltS3Client extends S3Client {
    constructor(configuration = {}) {
        super(configuration);
        this.IsMiddlwareStackUpdated = false;
        this.savedCredentials = configuration.credentials;
        this.IsMiddlwareStackUpdated = false;
    }
    // TODO: Add type definitions
    send(...args) {
        const _super = Object.create(null, {
            send: { get: () => super.send }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.savedCredentials) {
                this.savedCredentials = yield fromIni({ profile: "default" })();
            }
            const credentials = this.savedCredentials;
            if (!credentials)
                return new Error("AWS credentials are required!");
            if (!this.IsMiddlwareStackUpdated) {
                this.UpdateMiddlewareStack(credentials);
            }
            return _super.send.call(this, ...args);
        });
    }
    UpdateMiddlewareStack(credentials) {
        this.middlewareStack.add((next, context) => (args) => {
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
                new Error("Bolt URL could not be found.\nPlease expose env var BOLT_URL");
            args.request.hostname = boltURL;
            const signedHeaders = options["headers"] || {};
            args.request.headers = {};
            args.request.headers["X-Amz-Date"] = signedHeaders["X-Amz-Date"];
            args.request.headers["Authorization"] = signedHeaders["Authorization"].replace("content-length;content-type;", "");
            return next(args);
        }, {
            step: "finalizeRequest",
        });
        this.IsMiddlwareStackUpdated = true;
    }
}
exports.BoltS3Client = BoltS3Client;
//# sourceMappingURL=BoltS3Client.js.map