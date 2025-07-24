import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import { PdfReader } from 'pdfreader';
import fs from 'fs';

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

async function getPdfText(pdfFilePath) {
    let extractedText = '';
    const readPdfPromise = new Promise((resolve, reject) => {
        new PdfReader().parseFileItems(pdfFilePath, (err, item) => {
            if (err) {
                return reject(err);
            } else if (!item) {
                resolve(extractedText);
            } else if (item.text) {
                extractedText += item.text + '\n';
            }
        });
    });
    return readPdfPromise;
}

export const generate = async (initialPrompt, resumePath) => {
    let extractedResumeText = '';

    try {
        if (!resumePath || !fs.existsSync(resumePath)) {
            console.error(`Resume file not found at: ${resumePath}. Please ensure a valid resume file is selected.`);
            return "Resume file not found or invalid path provided.";
        }

        extractedResumeText = await getPdfText(resumePath);

        if (!extractedResumeText.trim()) {
            console.error("Could not extract any meaningful text from the PDF. Aborting.");
            return "Could not extract any meaningful text from the resume PDF.";
        }

        const finalPrompt = initialPrompt + `
dont use * to highlight the project name or any name like college name or anything.
No greeting just straight to answer.
If the code is asked just write the code dont use ' or " or dont write comments inside the code
The response should be under 2000 characters
---RESUME_START---
${extractedResumeText}
---RESUME_END---
`;
        console.log("Initial Prompt for AI:", initialPrompt);
        console.log("Generating content...");
        const result = await model.generateContent(finalPrompt);
        const generatedText = result.response.text();
        console.log("Generated Content:", generatedText);
        console.log("Content generation complete.");
        return generatedText;

    } catch (err) {
        console.error("Error during PDF reading or content generation:", err);
        return `Error generating content: ${err.message}`;
    }
};
