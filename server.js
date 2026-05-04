// npm install @google/genai express fs cors dotenv
import { GoogleGenAI } from "@google/genai"
import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import cors from 'cors'
import sqlite3 from 'sqlite3'

const PORT = 8000
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static("public")) //Load html to browser


const File_Path = '.env'


// identify the model we want to use for story generation
const model = "gemini-3-flash-preview"


const dbResume = new sqlite3.Database('ResumeDB.db', (err) => {
    if(err){
        console.error("Error opening database:",err.message)
    } else {
        console.log("Connected to Resume.db")
    }
})

//Send data to database/Generate ai prompt
app.post('/gen-resume', async (req, res) => {
    console.log(req.body)

    const { title, details, key } = req.query

    // Initialize the Google GenAI client with the API key from our .env file
    const genAI = new GoogleGenAI({apiKey: `${key}`})

    //send users apiKey input into our .env file
    const ApiKey = `GEMINI_API_KEY=${key}`
    fs.writeFileSync(File_Path, ApiKey)

    if (!title || !details || !key) {
        return res.status(400).send('Missing title, details or ApiKey parameters')
    }

    //Attempt to gnerate ai prompt
    try {
        const prompt = `Can you generate a resume with job title ${title} and the responsibilities/details of ${details}?`
        const objResponse = await genAI.models.generateContent({
            model: model,
            contents: prompt,
        })
        console.log(objResponse.text)

        const ResumeText = objResponse.text

        // creates a new object to store the resume 
        const objNewResume = {
            id: Date.now(),
            title:title,
            details: details,
            resume: ResumeText,
            date: new Date().toISOString()
        }

        //insert into database
        const strQuery = "INSERT INTO Resume VALUES (?,?,?,?,?)"
        dbResume.run(strQuery, [objNewResume.id, objNewResume.title, objNewResume.details, objNewResume.resume, JSON.stringify(objNewResume.date)], function(err){
        if (err){
            res.status(500).json({outcome:"error", message: err.message})
        } else{
            res.status(201).json({outcome:"Success",message:`Inserted with values ${JSON.stringify(objNewResume)}`})
        }
    })

    } catch (error) {
        console.error(error)
        res.status(500).send('Error generating resume: ' + error.message)
    }

    
})

// Get resume from database
app.get('/gen-resume', async (req, res) => {
    const { title, details } = req.query

    const strQuery = `SELECT * FROM Resume`
    dbResume.all(strQuery,[],function(err,rows) {
        if(err){
            res.status(500).json({outcome:"error",message:err.message})
        } else {
            res.status(200).json(rows)
        }
    })
    
})

app.listen(PORT, () => {
    console.log(`Resume workshop running on http://localhost:${PORT}`)
})