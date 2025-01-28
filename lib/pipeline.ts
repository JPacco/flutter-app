import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

interface PipelineProps {
    readonly actionName: string;
    readonly owner: string;
    readonly connectionArn: string;
    readonly repo: string;
    readonly branch: string;
}

export class Pipeline extends Construct {
    constructor(scope: Construct, id: string, props: PipelineProps) {
        super(scope, id);

        // Creamos un bucket 
        const websiteBucket = new s3.Bucket(this, 'FlutterWebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: new s3.BlockPublicAccess({  // Añadimos esta configuración
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false
            })
        });

        // Creamos el pipeline
        const pipeline = new codepipeline.Pipeline(this, 'Pipeline')

        // Definimos la fuente del pipeline, SOURCE
        const sourceOutput = new codepipeline.Artifact();
        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipeline_actions.CodeStarConnectionsSourceAction({
                    actionName: props.actionName,
                    owner: props.owner,
                    connectionArn: props.connectionArn,
                    repo: props.repo,
                    branch: props.branch,
                    output: sourceOutput
                })
            ]
        });

        // Creamos un Secreto para almacenar variables
        const secret = new secretsmanager.Secret(this, 'Secret', {
            description: "Store enviroment variables for the build",
        });

        // Definimos el pipeline de BUILD
        const codebuildProject = new codebuild.PipelineProject(this, 'CodeBuild', {
            environmentVariables: {
                // Definimos las variables de entorno
                TARGET_BUCKET_NAME: {
                    value: websiteBucket.bucketName,
                },
                SECRETS: {
                    value: secret.secretArn,
                    type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
                }
            },

            //Entorno de ejecucion
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
                computeType: codebuild.ComputeType.MEDIUM,
                privileged: true  // necesario para usar Docker
            },

            // Definimos el pipeline de BUILD
            buildSpec: codebuild.BuildSpec.fromObjectToYaml({
                version: "0.2",
                phases: {
                    pre_build: {
                        commands: [],
                    },
                    build: {
                        commands: [
                            'docker build -t flutter-app .',
                            'docker create --name flutter-container flutter-app',
                            'docker cp flutter-container:/app/build/web/ ./web/',
                        ]
                    },
                    post_build: {
                        commands: [
                            `aws s3 sync web/web/ s3://${websiteBucket.bucketName}/ --delete`,
                        ]
                    },
                },
            }),
        });

        // Definimos los roles para CodeBuild
        codebuildProject.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:DeleteObject",
                    "s3:ListBucket",
                ],
                resources: [
                    websiteBucket.bucketArn,
                    `${websiteBucket.bucketArn}/*`,
                ],
            }),
        );


        // codebuildProject.addToRolePolicy(
        //     new iam.PolicyStatement({
        //         effect: iam.Effect.ALLOW,
        //         actions: [
        //             "cloudfront:CreateInvalidation",
        //         ],
        //         resources: [
        //             "*"
        //         ],
        //     })
        // );

        secret.grantRead(codebuildProject);

        //Añadimos el stage BUILD a CODEPIPELINE
        pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'CodeBuild',
                    project: codebuildProject,
                    input: sourceOutput,
                }),
            ],
        });
    }
}