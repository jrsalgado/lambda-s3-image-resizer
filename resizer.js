'use strict';
const _ = require('lodash')
const aws = require('aws-sdk');
const Sharp = require('sharp');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const Promise = require('bluebird');

var buffer
module.exports.fromBucket = (event, context, callback) => {
    // Get the object from the event and show its content type
  console.log(JSON.stringify(event))
  const bucket = _.get(event, 'Records[0].s3.bucket.name')
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  const params = {
    Bucket: bucket,
    Key: key,
  };

    // 1.- Get image from s3
    // 2.- Resize image
    // 3.- Put image on s3 new bucket

  s3.getObject(params)
    .promise()
    .then(data => createThumbnail(data.Body, key, bucket)
          .then(newParams => s3
          .putObject(newParams)
          .promise())
    )
    .then((result) => {
      callback(null, result)
    })
    .catch(err=>{
      console.log(err);
      const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
      console.log(message);
      callback(message);
    });

    function createThumbnail(body, key, bucket) {
      var holdBuffer = function (data) {
        buffer = data;
        return buffer;
      }
      return Sharp(body)
        .resize(null, 200)
        .toFormat('jpeg')
        .toBuffer()
        .then(data => holdBuffer(data))
        .then(buffer => {

          let keyArray = key.split('/')
          let index = keyArray.indexOf('incoming')
          keyArray.splice(index, 1)
          let filename = keyArray.pop();
          let dir = keyArray.join('/');
          filename = `${dir}/200h_d_${filename}`

          let newParams = {
            Body: buffer,
            ACL: 'public-read',
            Bucket: bucket,
            Key: filename,
            ContentType: 'image/jpeg'
          };

          return newParams
        })
    }

};
