const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testR2Connection() {
  const client = new S3Client({
    region: process.env.CLOUDFLARE_R2_REGION || 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  try {
    console.log('Testing Cloudflare R2 connection...');
    console.log('Endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);
    console.log('Bucket:', process.env.CLOUDFLARE_R2_BUCKET);

    const command = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      MaxKeys: 1,
    });

    const response = await client.send(command);
    console.log('✅ Connection successful!');
    console.log('Objects in bucket:', response.KeyCount || 0);
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.Code);
  }
}

testR2Connection();
