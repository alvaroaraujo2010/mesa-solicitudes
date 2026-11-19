#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MesaSolicitudesStack } from '../lib/mesa-solicitudes-stack';

const app = new cdk.App();

new MesaSolicitudesStack(app, 'MesaSolicitudesStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Mesa de Solicitudes - API, almacenamiento y frontend estático',
});

app.synth();
