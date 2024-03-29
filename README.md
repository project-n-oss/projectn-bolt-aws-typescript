
# TypeScript SDK for Bolt

This SDK provides an authentication solution for programatically interacting with Bolt. It wraps the AWS S3 client class so project wide integration is as easy as refactoring `const { S3Client } = require("@aws-sdk/client-s3")` to `import { BoltS3Client } from "./BoltS3Client"`.

The package affects the signing and routing protocol of the AWS S3 client, therefore any non S3 clients created through this SDK will be un-affected by the wrapper.

## Install the SDK

```shell
npm i projectn-bolt-aws-typescript-sdk
```

## Using Typescript SDK for Bolt

Import the SDK into your project:

```shell
import { BoltS3Client } from "projectn-bolt-aws-typescript-sdk";
```

## Set up  Bolt Client

Replace the following in your application:
```shell
const client = new S3Client({});
```

with
```shell
const client = new BoltS3Client({});
```

## Configuration

For the client to work it must have knowledge of Bolt's *region* and *url*

The URL must be formatted as follows:

`https://<subdomain>{region}<domain>`

An example is:

`https://bolt.{region}.google.com`

Where the `{region}` within the URL is a string literal placeholder that will be replaced by the python sdk

**To expose Bolt's URL to the SDK:**

1. Declare the ENV variable: `BOLT_URL`

```bash
export BOLT_URL="<url>"
```

**There are two ways to expose Bolt's region to the SDK:**

1. If running on an EC2 instance the SDK will by default use that EC2s region
2. With the ENV variable: `AWS_REGION`.
```bash
export AWS_REGION='<region>'
```
