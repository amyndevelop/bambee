import { S3Client } from "@aws-sdk/client-s3";
export function storage() {
  if (!process.env.S3_BUCKET || !process.env.S3_ENDPOINT)
    throw new Error("Almacenamiento privado no configurado");
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
  });
}
