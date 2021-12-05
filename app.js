const express = require("express");
const app = express();
var bodyParser = require('body-parser');
const port = process.env.PORT || 5000;
const multer = require("multer");
const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});




app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/', express.static(__dirname));
app.use('/views', express.static(__dirname + '/'));
app.use(express.static(__dirname + '/'));
app.use('public', express.static(__dirname + '/'));
app.use('/result', express.static(__dirname + '/'));



//MS Specific
const axios = require("axios").default;
const async = require("async");
const fs = require("fs");
const https = require("https");
const path = require("path");
const createReadStream = require("fs").createReadStream;
const sleep = require("util").promisify(setTimeout);
const ComputerVisionClient =
  require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;


var speak="";
require('dotenv').config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const key = process.env.MS_COMPUTER_VISION_SUBSCRIPTION_KEY;
const endpoint = process.env.MS_COMPUTER_VISION_ENDPOINT;

const faceEndpoint = process.env.MS_FACE_ENDPOINT;
const subscriptionKey = process.env.MS_FACE_SUB_KEY;

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
  endpoint
);

//Server Setup
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(express.static(__dirname + '/public'));
//Routes
app.get("/", (req, res) => {
  res.render("index.ejs");
});
app.get("/result", (req, res) => {
res.sendFile(path.join(__dirname, 'output.mp3'));
});
var text="";
var colorr="";
app.post("/", upload.single("file-to-upload"), async (req, res) => {
  try {
    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    const brandURLImage = result.secure_url;
  
   
     // Analyze URL image
     console.log('Analyzing brands in image...', brandURLImage.split('/').pop());
     const brands = (await computerVisionClient.analyzeImage(brandURLImage, { visualFeatures: ['Brands'] })).brands;

     // Print the brands found
     if (brands.length) {
       console.log(`${brands.length} brand${brands.length != 1 ? 's' : ''} found:`);
       for (const brand of brands) {
         console.log(`    ${brand.name} (${brand.confidence.toFixed(2)} confidence)`);
         
        
       }
       var speak=brands[0].name+"";
       console.log(speak+"");
    text=" ";
        
      } else 
     {
        
        var text="The image does not have a clear or large enough recognizable brand logo. Please try with a different angle or resolution!";
        text="The image does not have a clear or large enough recognizable brand logo. Please try with a different angle or resolution!";
       
      }
     // </snippet_brands>
     console.log(text);


 
     console.log('-------------------------------------------------');
     console.log('DETECT COLOR SCHEME');
     console.log();

     // <snippet_colors>
     const colorURLImage = result.secure_url;
     console.log(colorURLImage);
     // Analyze URL image
     console.log('Analyzing image for color scheme...', colorURLImage.split('/').pop());
     console.log();
     const color = (await computerVisionClient.analyzeImage(colorURLImage, { visualFeatures: ['Color'] })).color;
     printColorScheme(color);
     // </snippet_colors>
    
     // <snippet_colors_print>
     // Print a detected color scheme
     function printColorScheme(colors) {
       console.log(`Image is in ${colors.isBwImg ? 'black and white' : 'color'}`);
       console.log(`Dominant colors: ${colors.dominantColors.join(', ')}`);
       console.log(`Dominant foreground color: ${colors.dominantColorForeground}`);
       console.log(`Dominant background color: ${colors.dominantColorBackground}`);
       console.log(`Suggested accent color: #${colors.accentColor}`);


      colorr =colors.dominantColorForeground;
      console.log(colorr);
     }
     // </snippet_colors_print>
     /**
      * END - Detect Color Scheme
      */
     console.log();


    res.render("result.ejs", { brands: brands, img: brandURLImage ,msgg:text,colorr:colorr });
  } catch (err) {
       
    console.log(err);
    
  }

  const { SpeechSynthesisOutputFormat, SpeechConfig, AudioConfig, SpeechSynthesizer } = require("microsoft-cognitiveservices-speech-sdk");

  function synthesizeSpeech() {   
     
    
      //replace "YourSubscriptionKey" and "YourServiceRegion" with your azure key and region
      //e.g. const speechConfig = SpeechConfig.fromSubscription("29f3f317abe376fd3b2a9b773112646d", "westeurope");
      const speechConfig = SpeechConfig.fromSubscription("e8161a6f99e24aee8938266971c36ff1", "eastus");
      speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
      const audioConfig = AudioConfig.fromAudioFileOutput("output.mp3");
  
      const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
      synthesizer.speakTextAsync(
          speak,
          result => {
              if (result) {
                  console.log(JSON.stringify(result));
              }
              synthesizer.close();
          },
          error => {
              console.log(error);
              synthesizer.close();
          });

          
  }
  
  synthesizeSpeech();
  

 

      
      
});




app.listen(port);
