import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User_Model, Submitted_forms_Model, Internshala_user_Model } from './data_base.js';
import { generate } from './ai.js';
import dotenv from 'dotenv'; 
dotenv.config();
const JWT_SECRET='ajldkldlkdshdhfh2342fddssxcbnb';
//await mongoose.connect("mongodb+srv://arinbalyan:ldZsIikKx3mlwSRf@cluster0.cksskgm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/Internshala_filler_database");
puppeteer.use(StealthPlugin());
let submission_detail=[];

const uploadResume = async (page, resumePath, sendProgress) => { // Added sendProgress
    try {
        if (!fs.existsSync(resumePath)) {
            throw new Error(`Resume file not found: ${resumePath}`);
        }

        sendProgress(`Attempting to upload resume: ${resumePath}`); // Use sendProgress

        const possibleSelectors = [
            'input[type="file"]',
            '#custom_resume',
            '#resume-upload',
            '.file-upload input',
            '[name="resume"]',
            '[name="cv"]',
            'input[accept*="pdf"]'
        ];

        let fileInput = null;
        
        for (const selector of possibleSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                fileInput = await page.$(selector);
                if (fileInput) {
                    sendProgress(`Found file input with selector: ${selector}`); // Use sendProgress
                    break;
                }
            } catch (e) {}
        }

        if (fileInput) {
            const absolutePath = path.resolve(resumePath);
            await fileInput.uploadFile(absolutePath);
            sendProgress('Resume uploaded successfully'); // Use sendProgress
            
            await new Promise(res => setTimeout(res, 3000));
            
        } else {
            sendProgress('WARN: No file input found - resume upload may not be required for this internship'); // Use sendProgress
            return false;
        }

        return true;

    } catch (error) {
        sendProgress(`ERROR: Resume upload failed: ${error.message}`); // Use sendProgress
        // await page.screenshot({ path: `resume-upload-error-${Date.now()}.png` });
        return false;
    }
};

const submitApplication = async (page, sendProgress) => { // Added sendProgress
    const possibleSubmitSelectors = [
        'input[type="submit"][id="submit"]',  
        'button[type="submit"]',
        '#submit',
        '.btn-primary',
        '.btn-large',
        'input[value="Submit"]'
    ];
        
    let submitted = false;
        
    for (const selector of possibleSubmitSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: 3000 });
            const submitButton = await page.$(selector);
            
            if (submitButton) {
                await submitButton.evaluate(btn => btn.scrollIntoView());
                await new Promise(res => setTimeout(res, 1000));
                await submitButton.click();
                sendProgress(`Submitted application using selector: ${selector}`); // Use sendProgress
                submitted = true;
                break;
            }
        } catch (e) {
            // Selector not found, try next
        }
    }
    if (!submitted) {
        sendProgress('WARN: No submit button found or clickable.'); // Use sendProgress
    }
    return submitted;
};

const clickApplyNowButton = async (page, sendProgress) => { // Added sendProgress
    try {
        sendProgress('Attempting to click "Apply now" button...'); // Use sendProgress
        
        await page.waitForSelector('#easy_apply_button', { visible: true, timeout: 10000 });
        
        await page.evaluate(() => {
            const button = document.getElementById('easy_apply_button');
            if (button) button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        await page.click('#easy_apply_button');
        sendProgress('Successfully clicked "Apply now" button'); // Use sendProgress
        
        await new Promise(res => setTimeout(res, 3000));
        
        return true;
    } catch (error) {
        sendProgress(`ERROR: Error clicking "Apply now" button: ${error.message}`); // Use sendProgress
        // await page.screenshot({ path: `apply-now-error-${Date.now()}.png` });
        return false;
    }
};

const fillAdditionalQuestions = async (page, company, title, sendProgress, resumePath) => { // Added resumePath
    try {
        sendProgress('Checking for additional questions...'); // Use sendProgress
        await new Promise(res => setTimeout(res, 2000));
        
        const textAreas = await page.$$('textarea');
        for (let i = 0; i < textAreas.length; i++) {
            try {
                const placeholder = await page.evaluate(el => el.placeholder || '', textAreas[i]);
                const label = await page.evaluate(el => {
                    const labelEl = el.closest('.form-group')?.querySelector('label');
                    return labelEl ? labelEl.textContent.trim() : '';
                }, textAreas[i]);
                
                sendProgress(`Found textarea with label: "${label}" and placeholder: "${placeholder}"`); // Use sendProgress
                
                // Handle Cover Letter specifically if present
                try {
                    const coverLetterHolderSelector = '#cover_letter_holder';
                    const coverLetterElement = await page.$(coverLetterHolderSelector);
                    if (coverLetterElement) {
                        sendProgress('Attempting to fill cover letter...'); // Use sendProgress
                        await coverLetterElement.click(); // Click the visible holder
                        const dynamicPrompt = `Write a professional cover letter for the company ${company}. The title of the job is ${title}.Ensure the letter highlights relevant skills and expresses enthusiasm for this specific role.`;
                        const coverLetter = await generate(dynamicPrompt, resumePath); // Pass resumePath
                        await page.type(coverLetterHolderSelector, coverLetter, { delay: 10 });
                        sendProgress('Filled cover letter.'); // Use sendProgress
                    }
                } catch(err) {
                    sendProgress(`WARN: Could not fill cover letter: ${err.message}`); // Use sendProgress
                }

                // Handle other text areas
                if (placeholder.toLowerCase().includes('why') || label.toLowerCase().includes('why')) {
                    const dynamicPrompt = `As a candidate, answer the question: "Why should we hire you for our company ${company} for the role of ${title}?" Highlight your fit based on the resume.`;
                    const hire_me = await generate(dynamicPrompt, resumePath); // Pass resumePath
                    await textAreas[i].click();
                    await textAreas[i].type(hire_me);
                    sendProgress('Filled "why interested" question.'); // Use sendProgress
                } else if (placeholder.toLowerCase().includes('experience') || label.toLowerCase().includes('experience')) {
                    const dynamicPrompt = `As a candidate for the ${title} position at ${company}, describe your relevant experience in this field and briefly discuss a project related to this role from your resume.`;
                    const ex = await generate(dynamicPrompt, resumePath); // Pass resumePath
                    await textAreas[i].click();
                    await textAreas[i].type(ex);
                    sendProgress('Filled experience question.'); // Use sendProgress
                } else {
                    const genericPrompt = `As a job candidate applying for the ${title} position at ${company}, please provide a concise and relevant answer to the following question found on the application form: Question: "${label} and ${placeholder} " Base your answer on the skills, experience, and projects detailed in the attached resume, ensuring it aligns with the role's requirements. Be professional and highlight your suitability.`;
                    const generic = await generate(genericPrompt, resumePath); // Pass resumePath
                    await textAreas[i].click();
                    await textAreas[i].type(generic);
                    sendProgress('Filled generic question.'); // Use sendProgress
                }
                
                await new Promise(res => setTimeout(res, 1000));
            } catch (textError) {
                sendProgress(`WARN: Could not fill textarea ${i}: ${textError.message}`); // Use sendProgress
            }
        }
        
        // Handle radio buttons
        const radioButtons = await page.$$('input[type="radio"]');
        for (let radio of radioButtons) {
            try {
                const value = await page.evaluate(el => el.value, radio);
                const name = await page.evaluate(el => el.name, radio);
                
                if (value && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true')) {
                    await radio.click();
                    sendProgress(`Selected radio button: ${name} = ${value}`); // Use sendProgress
                    await new Promise(res => setTimeout(res, 500));
                }
            } catch (radioError) {
                sendProgress(`WARN: Could not handle radio button: ${radioError.message}`); // Use sendProgress
            }
        }
        
        return true;
    } catch (error) {
        sendProgress(`ERROR: Error filling additional questions: ${error.message}`); // Use sendProgress
        return false;
    }
};

/**
 * Main function to run the Internshala automation.
 * @param {object} options - Options for the automation.
 * @param {string} options.email - Internshala email.
 * @param {string} options.param.password - Internshala password.
 * @param {string} options.resumePath - Path to the resume PDF.
 * @param {function(string): void} sendProgress - Callback to send progress updates to the renderer.
 * @param {function({title: string, company: string}): void} sendSubmittedInternship - Callback to send details of a submitted internship.
 * @returns {Promise<Array<{title: string, company: string}>>} - List of submitted internships.
 */
export const runInternshalaAutomation = async ({ email, password, resumePath }, sendProgress, sendSubmittedInternship) => {
    const browser = await puppeteer.launch({
        headless: false, // Changed to false to make the browser visible
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80'
    );

    page.setDefaultNavigationTimeout(60000); // Increased timeout

    let submission_detail = [];

    try {
        sendProgress('Navigating to Internshala registration page...');
        await page.goto('https://internshala.com/registration/student', { waitUntil: 'networkidle2' });
        await new Promise(res => setTimeout(res, 2000));

        sendProgress('Clicking login link...');
        await page.waitForSelector('#login-link-container span', { visible: true });
        await page.click('#login-link-container span');
        await new Promise(res => setTimeout(res, 2000));

        sendProgress('Typing email...');
        await page.type('#modal_email', email, { delay: 100 });
        await new Promise(res => setTimeout(res, 1000));
        sendProgress('Typing password...');
        await page.type('#modal_password', password, { delay: 100 });
        await new Promise(res => setTimeout(res, 3000));

        sendProgress('Clicking login submit...');
        await page.click('#modal_login_submit');
        await new Promise(res => setTimeout(res, 500));
        await page.click('#modal_login_submit'); // Sometimes needs a second click
        await new Promise(res => setTimeout(res, 5000));

        sendProgress('Navigating to matching preferences...');
        await page.goto('https://internshala.com/internships/matching-preferences/', {
            waitUntil: 'networkidle2',
        });
        await new Promise(res => setTimeout(res, 5000));

        try {
            const isChecked = await page.evaluate(() => {
                const checkbox = document.getElementById('matching_preference');
                return checkbox && checkbox.checked;
            });

            if (isChecked) {
                await page.click('#matching_preference');
                sendProgress('Checkbox unchecked successfully');
                await new Promise(res => setTimeout(res, 3000));
            }

            sendProgress('Selecting category...');
            await page.waitForSelector('#select_category_chosen', { visible: true, timeout: 10000 });
            await page.click('#select_category_chosen');
            await page.waitForSelector('.chosen-results .active-result', { visible: true, timeout: 5000 });
            await new Promise(res => setTimeout(res, 1000));
            // This selects the 140th option. You might want to make this configurable or dynamic.
            await page.click('li.active-result[data-option-array-index="140"]'); 
            await new Promise(res => setTimeout(res, 3000));
        } catch (error) {
            sendProgress(`ERROR: Error during category selection: ${error.message}`);
            // await page.screenshot({ path: 'error-screenshot.png' });
        }

        sendProgress('Scraping internship data...');
        const internshipData = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.individual_internship'));
            return elements
                .filter(el => {
                    const isHidden = window.getComputedStyle(el).display === 'none';
                    const hasId = el.id?.startsWith('individual_internship_');
                    return !isHidden && hasId;
                })
                .map(el => {
                    const linkElement = el.querySelector('a.job-title-href');
                    return {
                        id: el.id,
                        href: linkElement ? linkElement.getAttribute('href') : null,
                        fullUrl: linkElement ? `https://internshala.com${linkElement.getAttribute('href')}` : null,
                        title: linkElement ? linkElement.textContent.trim() : null,
                        company: el.querySelector('.company-name')?.textContent.trim() || null
                    };
                });
        });

        sendProgress(`Found ${internshipData.length} internships.`);

        let no_of_submission = Math.min(10, internshipData.length); // Limit to 10 for testing, adjust as needed

        for (let i = 0; i < no_of_submission; i++) {
            let urllink = internshipData[i].fullUrl;
            if (!urllink) {
                sendProgress(`Skipping internship ${i + 1} due to missing URL.`);
                continue;
            }

            sendProgress(`Processing internship ${i + 1}/${no_of_submission}: ${internshipData[i].title} at ${internshipData[i].company}`);
            await page.goto(urllink, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.internship_details', { timeout: 10000 }).catch(() => {});
            await new Promise(res => setTimeout(res, 1000));

            try {
                const applyClicked = await clickApplyNowButton(page, sendProgress);

                if (applyClicked) {
                    sendProgress('Waiting for application form...');
                    await new Promise(res => setTimeout(res, 5000));

                    // Handle "Proceed to application" button if it appears
                    try {
                        const proceedButtonSelector = 'button.btn.btn-large.education_incomplete.proceed-btn';
                        const proceedButton = await page.$(proceedButtonSelector);
                        if (proceedButton) {
                            const isVisible = await page.evaluate(el => {
                                const style = window.getComputedStyle(el);
                                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                            }, proceedButton);

                            if (isVisible) {
                                sendProgress("Clicking 'Proceed to application' button...");
                                await proceedButton.evaluate(btn => btn.scrollIntoView());
                                await new Promise(res => setTimeout(res, 500));
                                await proceedButton.click();
                                sendProgress("Clicked 'Proceed to application' button successfully.");
                                await new Promise(res => setTimeout(res, 3000));
                            } else {
                                sendProgress("WARN: 'Proceed to application' button found but not visible/clickable.");
                            }
                        }
                    } catch (error) {
                        sendProgress(`WARN: Error handling 'Proceed to application' button: ${error.message}`);
                    }

                    // Handle availability radio button
                    try {
                        await page.waitForSelector('#radio1', { visible: true, timeout: 5000 });
                        await page.click('#radio1');
                        sendProgress('Selected availability radio button.');
                    } catch (err) {
                        sendProgress(`WARN: Could not select availability radio button: ${err.message}`);
                    }

                    await uploadResume(page, resumePath, sendProgress);
                    // Pass resumePath to fillAdditionalQuestions
                    await fillAdditionalQuestions(page, internshipData[i].company, internshipData[i].title, sendProgress, resumePath);
                    const submitted = await submitApplication(page, sendProgress);

                    if (submitted) {
                        const submittedInternship = { title: internshipData[i].title, company: internshipData[i].company, url: internshipData[i].fullUrl };
                        submission_detail.push(submittedInternship);
                        sendSubmittedInternship(submittedInternship); // Send real-time update
                        sendProgress(`Successfully submitted application for: ${internshipData[i].title} at ${internshipData[i].company}`);
                    } else {
                        sendProgress(`Failed to submit application for: ${internshipData[i].title} at ${internshipData[i].company}`);
                    }
                    await new Promise(res => setTimeout(res, 5000)); // Wait after submission
                } else {
                    sendProgress(`Could not proceed with application for: ${internshipData[i].title} at ${internshipData[i].company} (Apply Now button failed).`);
                }

            } catch (error) {
                sendProgress(`ERROR: General error during application for ${internshipData[i].title}: ${error.message}`);
            }

            sendProgress('Navigating back to internship list...');
            await page.goBack({ waitUntil: 'networkidle2' });
            await page.waitForSelector('.individual_internship', { timeout: 5000 }).catch(() => {});
        }
    } catch (mainError) {
        sendProgress(`FATAL ERROR: ${mainError.message}`);
    } finally {
        sendProgress('Automation complete. Closing browser.');
        await browser.close();
    }

    return submission_detail;
};
