document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "https://cse-question-bank-api.fardin83832006.workers.dev"; 

    // DOM Elements
    const form = document.getElementById("uploadForm");

    const crIdInput = document.getElementById("crId");
    const crNameInput = document.getElementById("crName");
    const whatsappInput = document.getElementById("whatsappNumber");

    const batchInput = document.getElementById("batchNo");
    const sessionInput = document.getElementById("sessionName");
    const yearInput = document.getElementById("yearNo");
    const examInput = document.getElementById("examName");
    const semesterInput = document.getElementById("semesterNo");

    const fileUploadButton = document.getElementById("fileUploadButton");
    const pdfFileInput = document.getElementById("pdfFileInput");
    const pdfPreview = document.getElementById("pdfPreview");
    const pdfInfo = document.getElementById("pdfInfo");

    const generatedPathPreview = document.getElementById("generatedPathPreview");
    const generatedFilename = document.getElementById("generatedFilename");
    const generatedPath = document.getElementById("generatedPath");

    const submitButton = document.getElementById("uploadButton");
    const messageBox = document.getElementById("message");

    let selectedPDF = null;
    let isSyncing = false; // Prevents recursive stack execution

    // Safe Helper functions
    function normalizeBatch(value) {
  const match = String(value ?? "").trim().match(/^(\d+)(st|nd|rd|th)?$/i);
  if (!match) return "";

  const number = Number(match[1]);
  if (!Number.isSafeInteger(number) || number < 1) return "";

  const lastTwo = number % 100;
  let suffix = "th";

  if (lastTwo < 11 || lastTwo > 13) {
    const lastDigit = number % 10;
    if (lastDigit === 1) suffix = "st";
    else if (lastDigit === 2) suffix = "nd";
    else if (lastDigit === 3) suffix = "rd";
  }

  return `${number}${suffix}`;
}

    function normalizeSession(val) {
        if (!val) return "";
        const clean = val.trim().toLowerCase();
        if (clean.includes("spring")) return "Spring";
        if (clean.includes("fall")) return "Fall";
        return "";
    }

    function normalizeYear(val) {
        if (!val) return "";
        const clean = val.trim().replace(/\D/g, "");
        return clean.length === 4 ? clean : "";
    }

    function normalizeExam(val) {
        if (!val) return "";
        const clean = val.trim().toLowerCase();
        if (clean.includes("mid")) return "Mid";
        if (clean.includes("final")) return "Final";
        return "";
    }

    function normalizeSemester(val) {
        if (!val) return "";
        const clean = val.trim().replace(/\D/g, "");
        if (!clean) return "";
        const num = parseInt(clean, 10);
        if (num >= 1 && num <= 8) {
            return num < 10 ? `0${num}` : `${num}`;
        }
        return "";
    }

    function showMessage(msg, type = "info") {
        if (!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = `message ${type}`;
        messageBox.classList.remove("hidden");
    }

    function hideMessage() {
        if (!messageBox) return;
        messageBox.classList.add("hidden");
    }

    function hidePDFPreview() {
        if (pdfPreview) pdfPreview.classList.add("hidden");
    }

    function showPDFPreview(fileName, fileSizeMB) {
        if (pdfPreview && pdfInfo) {
            pdfInfo.textContent = `${fileName} (${fileSizeMB} MB)`;
            pdfPreview.classList.remove("hidden");
        }
    }

    function getGeneratedFileData() {
        const batch = normalizeBatch(batchInput ? batchInput.value : "");
        const session = normalizeSession(sessionInput ? sessionInput.value : "");
        const year = normalizeYear(yearInput ? yearInput.value : "");
        const exam = normalizeExam(examInput ? examInput.value : "");
        const semester = normalizeSemester(semesterInput ? semesterInput.value : "");

        if (!batch || !session || !year || !exam || !semester) {
            return null;
        }

        const filename = `Batch-${batch}_${session}-${year}_${exam}.pdf`;
        const path = `Semester_${semester}/${filename}`;

        return { batch, session, year, exam, semester, filename, path };
    }

    // Stack Overflow Safe UI Sync Function
    function syncFormState() {
        if (isSyncing) return; // Prevent recursive calls
        isSyncing = true;

        const fileData = getGeneratedFileData();

        // Update path & filename UI
        if (fileData && generatedPathPreview && generatedFilename && generatedPath) {
            generatedFilename.textContent = fileData.filename;
            generatedPath.textContent = fileData.path;
            generatedPathPreview.classList.remove("hidden");
        } else if (generatedPathPreview) {
            generatedPathPreview.classList.add("hidden");
        }

        // Validate Button State
        if (submitButton) {
            const crId = crIdInput ? crIdInput.value.trim() : "";
            const crName = crNameInput ? crNameInput.value.trim() : "";
            const whatsapp = whatsappInput ? whatsappInput.value.trim() : "";

            const isValid = Boolean(crId && crName && whatsapp && fileData && selectedPDF);
            submitButton.disabled = !isValid;
        }

        isSyncing = false;
    }

    function resetFormFields() {
        const inputsToClear = [
            crIdInput, crNameInput, whatsappInput, 
            batchInput, sessionInput, yearInput, 
            examInput, semesterInput
        ];

        inputsToClear.forEach(input => {
            if (input) input.value = "";
        });

        selectedPDF = null;
        if (pdfFileInput) pdfFileInput.value = "";
        hidePDFPreview();
        syncFormState();
    }

    // ✅ CLICK HANDLER: Perfectly Isolated Trigger
    if (fileUploadButton && pdfFileInput) {
        fileUploadButton.addEventListener("click", (e) => {
            e.preventDefault();
            pdfFileInput.click();
        });
    }

    // ✅ FILE CHANGE HANDLER
    if (pdfFileInput) {
        pdfFileInput.addEventListener("change", (e) => {
            const file = e.target.files ? e.target.files[0] : null;

            if (!file) {
                selectedPDF = null;
                hidePDFPreview();
                syncFormState();
                return;
            }

            if (file.type !== "application/pdf") {
                showMessage("Only PDF files are allowed.", "error");
                pdfFileInput.value = "";
                selectedPDF = null;
                hidePDFPreview();
                syncFormState();
                return;
            }

            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            if (file.size > 15 * 1024 * 1024) {
                showMessage("File size exceeds 15 MB limit.", "error");
                pdfFileInput.value = "";
                selectedPDF = null;
                hidePDFPreview();
                syncFormState();
                return;
            }

            hideMessage();
            selectedPDF = file;
            showPDFPreview(file.name, fileSizeMB);
            syncFormState();
        });
    }

    // Attach Input Event Listeners
    const allFormInputs = [
        crIdInput, crNameInput, whatsappInput, 
        batchInput, sessionInput, yearInput, 
        examInput, semesterInput
    ];

    allFormInputs.forEach(input => {
        if (input) {
            input.addEventListener("input", syncFormState);
        }
    });

    // =========================================
    // SUBMIT HANDLER (LOOP FREE)
    // =========================================
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const crId = crIdInput ? crIdInput.value.trim() : "";
            const crName = crNameInput ? crNameInput.value.trim() : "";
            const whatsappNumber = whatsappInput ? whatsappInput.value.trim() : "";

            if (!crId) {
                showMessage("Please enter your CR ID.", "error");
                return;
            }

            if (!crName) {
                showMessage("Please enter your name.", "error");
                return;
            }

            if (!whatsappNumber) {
                showMessage("Please enter your WhatsApp number.", "error");
                return;
            }

            const normalizedWhatsApp = whatsappNumber.replace(/[\s\-()]/g, "");
            const validBangladeshNumber = /^(\+8801|8801|01)\d{9}$/.test(normalizedWhatsApp);

            if (!validBangladeshNumber) {
                showMessage("Please enter a valid Bangladesh WhatsApp number.", "error");
                return;
            }

            const fileData = getGeneratedFileData();
            if (!fileData) {
                showMessage("Please fill all question paper details correctly.", "error");
                return;
            }

            if (!selectedPDF) {
                showMessage("Please choose a PDF question paper.", "error");
                return;
            }

            const crToken = sessionStorage.getItem("cr_token");
            if (!crToken) {
                showMessage("Your CR session has expired. Please login again.", "error");
                return;
            }

            const formData = new FormData();
            formData.append("crId", crId);
            formData.append("crName", crName);
            formData.append("whatsappNumber", normalizedWhatsApp);
            formData.append("batch", fileData.batch);
            formData.append("session", fileData.session);
            formData.append("year", fileData.year);
            formData.append("exam", fileData.exam);
            formData.append("semester", fileData.semester);
            formData.append("filename", fileData.filename);
            formData.append("githubPath", fileData.path);
            formData.append("file", selectedPDF);

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
            }

            try {
                const response = await fetch(`${API_URL}/upload-request`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${crToken}`
                    },
                    body: formData
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || data.message || "Upload failed.");
                }

                showMessage(`Question paper submitted successfully! File: ${fileData.filename}`, "success");
                resetFormFields();

            } catch (error) {
                console.error("Upload error:", error);
                showMessage(error.message || "Something went wrong while uploading.", "error");
            } finally {
                if (submitButton) {
                    submitButton.innerHTML = "Submit for Review";
                }
                syncFormState();
            }
        });
    }

    // Run initial state setup
    syncFormState();
});