import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline } from './pipeline';


export class MainStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const pipeline = new Pipeline(this, 'Pipeline', {
            actionName: "Github",
            owner: "<Owner>",
            connectionArn: "<ConnectionArn>",
            repo: "deploy_Flutter_app",
            branch: "main",
        })
    }
}