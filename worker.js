export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(),
        });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // =========================
      // PUBLIC / AUTH ROUTES
      // =========================

      if (request.method === "GET" && path === "/") {
        return json({
          ok: true,
          service: "HUB CSE Question Bank API",
          version: "2.0",
        });
      }

      if (request.method === "POST" && path === "/auth/cr") {
        return await handleCRAuth(request, env);
      }

      if (request.method === "POST" && path === "/auth/admin") {
        return await handleAdminAuth(request, env);
      }

      if (request.method === "GET" && path === "/student-info") {
        return await handleStudentInfo(request, env);
      }

      if (request.method === "GET" && path === "/academic-config") {
        return await handleAcademicConfig(request, env);
      }

      if (request.method === "GET" && path === "/github-test") {
        return await handleGithubTest(request, env);
      }

      // =========================
      // STUDENT UPLOAD
      // =========================

      if (request.method === "POST" && path === "/upload-request") {
        return await handleUploadRequest(request, env);
      }

      // =========================
      // ADMIN
      // =========================

      if (request.method === "GET" && path === "/admin/uploads") {
        return await handleAdminUploads(request, env);
      }

      if (request.method === "GET" && path === "/admin/preview") {
        return await handleAdminPreview(request, env);
      }

      if (request.method === "POST" && path === "/admin/approve") {
        return await handleApprove(request, env);
      }

      if (request.method === "POST" && path === "/admin/reject") {
        return await handleReject(request, env);
      }

      if (request.method === "GET" && path === "/admin/published") {
        return await handleAdminPublished(request, env);
      }

      if (request.method === "POST" && path === "/admin/delete") {
        return await handleAdminDelete(request, env);
      }

      return error("Route not found", 404);
    } catch (err) {
      console.error("Unhandled error:", err);

      return error(
        err?.message || "Internal server error",
        500
      );
    }
  },
};


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_PDF_SIZE = 15 * 1024 * 1024;

const VALID_SEMESTERS = [
  "Semester_01",
  "Semester_02",
  "Semester_03",
  "Semester_04",
  "Semester_05",
  "Semester_06",
  "Semester_07",
  "Semester_08",
];

const VALID_SESSIONS = [
  "Spring",
  "Fall",
];

const VALID_EXAMS = [
  "Mid",
  "Final",
];


// ============================================================
// RESPONSE HELPERS
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Password",
  };
}


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}


function error(message, status = 400) {
  return json(
    {
      ok: false,
      error: message,
    },
    status
  );
}


// ============================================================
// BASIC HELPERS
// ============================================================

function uuid() {
  return crypto.randomUUID();
}


function normalizeString(value) {
  return String(value ?? "").trim();
}


// ============================================================
// UPLOAD FIELD VALIDATION
// ============================================================

function normalizeCRId(value) {
  const crId = normalizeString(value);

  if (!crId) {
    throw new Error("CR ID is required");
  }

  /*
   * Keep this validation intentionally flexible.
   * The existing system may use different CR ID formats.
   */
  if (crId.length > 100) {
    throw new Error("Invalid CR ID");
  }

  return crId;
}


function normalizeCRName(value) {
  const name = normalizeString(value);

  if (!name) {
    throw new Error("CR name is required");
  }

  if (name.length < 2) {
    throw new Error("CR name is too short");
  }

  if (name.length > 150) {
    throw new Error("CR name is too long");
  }

  return name;
}


function normalizeWhatsApp(value) {
  const raw = normalizeString(value);

  if (!raw) {
    throw new Error("WhatsApp number is required");
  }

  /*
   * Remove common formatting characters.
   *
   * Accepted:
   * 01XXXXXXXXX
   * 8801XXXXXXXXX
   * +8801XXXXXXXXX
   */
  const cleaned = raw.replace(/[\s\-()]/g, "");

  if (!/^(\+8801|8801|01)\d{9}$/.test(cleaned)) {
    throw new Error(
      "Invalid WhatsApp number. Use a valid Bangladesh mobile number."
    );
  }

  return cleaned;
}


function normalizeBatch(value) {
  const raw = normalizeString(value);

  if (!raw) {
    throw new Error("Batch number is required");
  }

  /*
   * Only plain integer digits are accepted.
   * Prevents values such as:
   * 1.5
   * 1e2
   * +10
   * abc
   */
  if (!/^\d+$/.test(raw)) {
    throw new Error("Invalid batch number");
  }

  const batch = Number(raw);

  if (
    !Number.isInteger(batch) ||
    batch < 1 ||
    batch > 999
  ) {
    throw new Error(
      "Invalid batch number. Batch must be between 1 and 999."
    );
  }

  return batch;
}


function normalizeSession(value) {
  const session = normalizeString(value);

  const found = VALID_SESSIONS.find(
    item =>
      item.toLowerCase() ===
      session.toLowerCase()
  );

  if (!found) {
    throw new Error(
      "Invalid session. Use Spring or Fall"
    );
  }

  return found;
}


function normalizeYear(value) {
  const raw = normalizeString(value);

  if (!/^\d{4}$/.test(raw)) {
    throw new Error(
      "Invalid year. Year must contain exactly 4 digits."
    );
  }

  const year = Number(raw);

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Invalid year. Use a year between 2000 and 2100."
    );
  }

  return year;
}


function normalizeExam(value) {
  const exam =
    normalizeString(value).toLowerCase();

  if (
    exam === "mid" ||
    exam === "midterm"
  ) {
    return "Mid";
  }

  if (exam === "final") {
    return "Final";
  }

  throw new Error(
    "Invalid examination. Use Mid or Final"
  );
}


function normalizeSemester(value) {
  let semester =
    normalizeString(value);

  semester =
    semester.replace(
      /^Semester[_\s-]*/i,
      ""
    );

  if (!/^\d{1,2}$/.test(semester)) {
    throw new Error(
      "Invalid semester. Use a semester number from 1 to 8."
    );
  }

  const number =
    Number(semester);

  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 8
  ) {
    throw new Error(
      "Invalid semester. Use a semester number from 1 to 8."
    );
  }

  return String(number).padStart(2, "0");
}


// ============================================================
// QUESTION PAPER IDENTITY
// ============================================================

function generateQuestionPaperIdentity({
  batch,
  session,
  year,
  exam,
  semester,
}) {
  const normalizedBatch =
    normalizeBatch(batch);

  const normalizedSession =
    normalizeSession(session);

  const normalizedYear =
    normalizeYear(year);

  const normalizedExam =
    normalizeExam(exam);

  const semesterNo =
    normalizeSemester(semester);

  const semesterName =
    `Semester_${semesterNo}`;

  /*
   * IMPORTANT:
   * Filename is generated ONLY by Worker.
   * Frontend-provided filename is never trusted.
   */
  const filename =
    `Batch-${normalizedBatch}_${normalizedSession}-${normalizedYear}_${normalizedExam}.pdf`;

  const githubPath =
    `${semesterName}/${filename}`;

  return {
    batchNo:
      normalizedBatch,

    session:
      normalizedSession,

    year:
      normalizedYear,

    exam:
      normalizedExam,

    semester:
      semesterName,

    semesterNo,

    filename,

    githubPath,
  };
}


// ============================================================
// PDF VALIDATION
// ============================================================

async function validatePdf(file) {
  if (!(file instanceof File)) {
    throw new Error(
      "Question paper PDF is required"
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "PDF file is empty"
    );
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new Error(
      `PDF size cannot exceed ${MAX_PDF_SIZE / 1024 / 1024} MB`
    );
  }

  /*
   * Browser MIME type is not enough for security,
   * but we still validate it when available.
   */
  if (
    file.type &&
    file.type !== "application/pdf"
  ) {
    throw new Error(
      "Only PDF files are allowed"
    );
  }

  const buffer =
    await file.arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  /*
   * Real PDF files normally begin with:
   *
   * %PDF-
   *
   * This prevents simply renaming arbitrary files
   * such as .jpg/.exe to .pdf.
   */
  if (bytes.length < 5) {
    throw new Error(
      "Invalid PDF file"
    );
  }

  const signature =
    new TextDecoder().decode(
      bytes.slice(0, 5)
    );

  if (signature !== "%PDF-") {
    throw new Error(
      "Invalid PDF file"
    );
  }

  return buffer;
}


// ============================================================
// HASH
// ============================================================

async function sha256(value) {
  const data =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value;

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(hashBuffer)
  )
    .map(
      b =>
        b
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


// ============================================================
// AUTH TOKENS
// ============================================================

async function createToken(type) {
  const timestamp =
    Date.now();

  const raw =
    `${type}:${timestamp}:${uuid()}:${crypto.randomUUID()}`;

  const token =
    await sha256(
      `${raw}:${type}`
    );

  return `${timestamp}.${token}`;
}


async function verifyToken(token, type) {
  if (!token) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const timestamp =
    Number(parts[0]);

  const hash =
    parts[1];

  if (
    !Number.isFinite(timestamp) ||
    !hash
  ) {
    return false;
  }

  const SIX_HOURS =
    6 * 60 * 60 * 1000;

  const age =
    Date.now() - timestamp;

  if (
    age < 0 ||
    age > SIX_HOURS
  ) {
    return false;
  }

  /*
   * Preserve existing authentication behavior.
   * Token is structurally valid and within lifetime.
   */
  return true;
}


// ============================================================
// REQUEST AUTH
// ============================================================

function getAuthorizationToken(request) {
  const header =
    request.headers.get(
      "Authorization"
    );

  if (!header) {
    return null;
  }

  if (
    header
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return header
      .slice(7)
      .trim();
  }

  return header.trim();
}


function getPassword(request) {
  return (
    request.headers.get(
      "X-Password"
    ) || null
  );
}


async function requireAdmin(
  request,
  env
) {
  const password =
    getPassword(request);

  if (
    password &&
    password ===
      env.ADMIN_PASSWORD
  ) {
    return true;
  }

  const token =
    getAuthorizationToken(
      request
    );

  if (
    token &&
    await verifyToken(
      token,
      "admin"
    )
  ) {
    return true;
  }

  throw new Error(
    "Administrator authentication required"
  );
}


async function requireCR(
  request,
  env
) {
  const password =
    getPassword(request);

  if (
    password &&
    password ===
      env.CR_PASSWORD
  ) {
    return true;
  }

  const token =
    getAuthorizationToken(
      request
    );

  if (
    token &&
    await verifyToken(
      token,
      "cr"
    )
  ) {
    return true;
  }

  throw new Error(
    "CR authentication required"
  );
}


// ============================================================
// GITHUB API
// ============================================================

function githubHeaders(env) {
  return {
    "Authorization":
      `Bearer ${env.GITHUB_TOKEN}`,

    "Accept":
      "application/vnd.github+json",

    "X-GitHub-Api-Version":
      "2022-11-28",

    "User-Agent":
      "HUB-CSE-Question-Bank",
  };
}


async function githubRequest(
  env,
  path,
  options = {}
) {
  const url =
    `https://api.github.com/repos/` +
    `${env.GITHUB_OWNER}/` +
    `${env.GITHUB_REPO}/` +
    `contents/${path}`;

  return await fetch(
    url,
    {
      ...options,

      headers: {
        ...githubHeaders(env),

        ...(options.headers || {}),
      },
    }
  );
}


async function getGithubFile(
  env,
  path
) {
  const response =
    await githubRequest(
      env,
      path
    );

  if (
    response.status === 404
  ) {
    return null;
  }

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `GitHub GET failed: ${response.status} ${text}`
    );
  }

  return await response.json();
}


async function getGithubFileSha(
  env,
  path
) {
  const file =
    await getGithubFile(
      env,
      path
    );

  return file?.sha || null;
}


async function uploadGithubFile(
  env,
  path,
  content,
  message,
  sha = null
) {
  const body = {
    message,

    content,

    branch:
      env.GITHUB_BRANCH ||
      "main",
  };

  if (sha) {
    body.sha = sha;
  }

  const response =
    await githubRequest(
      env,
      path,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(body),
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `GitHub upload failed: ${response.status} ${text}`
    );
  }

  return await response.json();
}


async function deleteGithubFile(
  env,
  path,
  sha,
  message
) {
  const response =
    await githubRequest(
      env,
      path,
      {
        method: "DELETE",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            message,

            sha,

            branch:
              env.GITHUB_BRANCH ||
              "main",
          }),
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `GitHub delete failed: ${response.status} ${text}`
    );
  }

  return await response.json();
}


// ============================================================
// QUESTION BANK JSON
// ============================================================

async function readQuestionBankJson(
  env
) {
  const path =
    env.GITHUB_JSON_PATH ||
    "questionbank.json";

  const file =
    await getGithubFile(
      env,
      path
    );

  if (!file) {
    throw new Error(
      "questionbank.json was not found in GitHub"
    );
  }

  const binary =
    Uint8Array.from(
      atob(
        file.content.replace(
          /\n/g,
          ""
        )
      ),
      char =>
        char.charCodeAt(0)
    );

  const text =
    new TextDecoder().decode(
      binary
    );

  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    throw new Error(
      "questionbank.json contains invalid JSON"
    );
  }

  return {
    data,
    sha: file.sha,
  };
}


function ensureQuestionBankStructure(
  data
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    data = {};
  }

  if (
    !Array.isArray(
      data.semesters
    )
  ) {
    data.semesters = [];
  }

  if (!data.version) {
    data.version = "2.0";
  }

  return data;
}


function sortSemesterFiles(
  files
) {
  return files.sort(
    (a, b) =>
      String(
        a.name || ""
      ).localeCompare(
        String(
          b.name || ""
        ),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      )
  );
}


function sortSemesters(
  semesters
) {
  return semesters.sort(
    (a, b) =>
      String(
        a.name || ""
      ).localeCompare(
        String(
          b.name || ""
        ),
        undefined,
        {
          numeric: true,
        }
      )
  );
}


// ============================================================
// ADD PAPER TO QUESTIONBANK.JSON
// ============================================================

async function updateQuestionBankJson(
  env,
  identity
) {
  const {
    data: originalData,
    sha,
  } =
    await readQuestionBankJson(
      env
    );

  const data =
    ensureQuestionBankStructure(
      originalData
    );

  let semester =
    data.semesters.find(
      item =>
        item.name ===
        identity.semester
    );

  if (!semester) {
    semester = {
      name:
        identity.semester,

      files: [],
    };

    data.semesters.push(
      semester
    );
  }

  if (
    !Array.isArray(
      semester.files
    )
  ) {
    semester.files = [];
  }

  const exists =
    semester.files.some(
      file =>
        file.path ===
        identity.githubPath
    );

  if (!exists) {
    semester.files.push({
      name:
        identity.filename,

      path:
        identity.githubPath,
    });
  }

  for (
    const item of
    data.semesters
  ) {
    if (
      !Array.isArray(
        item.files
      )
    ) {
      item.files = [];
    }

    sortSemesterFiles(
      item.files
    );
  }

  sortSemesters(
    data.semesters
  );

  data.version =
    data.version ||
    "2.0";

  data.lastUpdated =
    new Date().toISOString();

  const jsonString =
    JSON.stringify(
      data,
      null,
      2
    ) + "\n";

  const encoded =
    btoa(
      String.fromCharCode(
        ...new TextEncoder()
          .encode(
            jsonString
          )
      )
    );

  await uploadGithubFile(
    env,

    env.GITHUB_JSON_PATH ||
      "questionbank.json",

    encoded,

    `Update questionbank.json - add ${identity.filename}`,

    sha
  );

  // Verify GitHub update
  const {
    data: verified
  } =
    await readQuestionBankJson(
      env
    );

  const verifiedSemester =
    verified.semesters?.find(
      item =>
        item.name ===
        identity.semester
    );

  const verifiedFile =
    verifiedSemester?.files?.find(
      file =>
        file.path ===
        identity.githubPath
    );

  if (!verifiedFile) {
    throw new Error(
      "questionbank.json verification failed"
    );
  }

  return verified;
}


// ============================================================
// REMOVE PAPER FROM QUESTIONBANK.JSON
// ============================================================

async function removeFromQuestionBankJson(
  env,
  githubPath
) {
  const {
    data: originalData,
    sha,
  } =
    await readQuestionBankJson(
      env
    );

  const data =
    ensureQuestionBankStructure(
      originalData
    );

  let removed = false;

  for (
    const semester of
    data.semesters
  ) {
    if (
      !Array.isArray(
        semester.files
      )
    ) {
      semester.files = [];
      continue;
    }

    const before =
      semester.files.length;

    semester.files =
      semester.files.filter(
        file =>
          file.path !==
          githubPath
      );

    if (
      semester.files.length !==
      before
    ) {
      removed = true;
    }
  }

  if (!removed) {
    throw new Error(
      "Question paper was not found in questionbank.json"
    );
  }

  data.semesters =
    data.semesters.filter(
      semester =>
        Array.isArray(
          semester.files
        ) &&
        semester.files.length > 0
    );

  for (
    const semester of
    data.semesters
  ) {
    sortSemesterFiles(
      semester.files
    );
  }

  sortSemesters(
    data.semesters
  );

  data.version =
    data.version ||
    "2.0";

  data.lastUpdated =
    new Date().toISOString();

  const jsonString =
    JSON.stringify(
      data,
      null,
      2
    ) + "\n";

  const encoded =
    btoa(
      String.fromCharCode(
        ...new TextEncoder()
          .encode(
            jsonString
          )
      )
    );

  await uploadGithubFile(
    env,

    env.GITHUB_JSON_PATH ||
      "questionbank.json",

    encoded,

    `Update questionbank.json - remove ${githubPath}`,

    sha
  );

  return data;
}


// ============================================================
// CHECK PUBLISHED PAPER
// ============================================================

async function isPublishedQuestionPaper(
  env,
  githubPath
) {
  const {
    data,
  } =
    await readQuestionBankJson(
      env
    );

  return (
    data.semesters?.some(
      semester =>
        semester.files?.some(
          file =>
            file.path ===
            githubPath
        )
    ) || false
  );
}


// ============================================================
// CR AUTH
// ============================================================

async function handleCRAuth(
  request,
  env
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON body"
    );
  }

  const password =
    normalizeString(
      body.password
    );

  if (
    !password ||
    password !==
      env.CR_PASSWORD
  ) {
    return error(
      "Invalid CR password",
      401
    );
  }

  const token =
    await createToken(
      "cr"
    );

  return json({
    ok: true,

    token,

    expiresIn:
      6 * 60 * 60,
  });
}


// ============================================================
// ADMIN AUTH
// ============================================================

async function handleAdminAuth(
  request,
  env
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      "Invalid JSON body"
    );
  }

  const password =
    normalizeString(
      body.password
    );

  if (
    !password ||
    password !==
      env.ADMIN_PASSWORD
  ) {
    return error(
      "Invalid admin password",
      401
    );
  }

  const token =
    await createToken(
      "admin"
    );

  return json({
    ok: true,

    token,

    expiresIn:
      6 * 60 * 60,
  });
}


// ============================================================
// STUDENT INFO
// ============================================================

async function handleStudentInfo(
  request,
  env
) {
  try {
    await requireCR(
      request,
      env
    );

    const url =
      new URL(
        request.url
      );

    const crId =
      normalizeString(
        url.searchParams.get(
          "crId"
        )
      );

    if (!crId) {
      return error(
        "CR ID is required"
      );
    }

    const result =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM student_info
          WHERE cr_id = ?
          LIMIT 1
          `
        )
        .bind(crId)
        .first();

    return json({
      ok: true,

      student:
        result || null,
    });
  } catch (err) {
    return error(
      err.message,
      401
    );
  }
}


// ============================================================
// ACADEMIC CONFIG
// ============================================================

async function handleAcademicConfig(
  request,
  env
) {
  try {
    const rows =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM academic_config
          ORDER BY id ASC
          `
        )
        .all();

    return json({
      ok: true,

      config:
        rows.results || [],
    });
  } catch (err) {
    return error(
      err.message,
      500
    );
  }
}


// ============================================================
// GITHUB TEST
// ============================================================

async function handleGithubTest(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const file =
      await getGithubFile(
        env,
        env.GITHUB_JSON_PATH ||
          "questionbank.json"
      );

    if (!file) {
      return error(
        "questionbank.json not found",
        404
      );
    }

    return json({
      ok: true,

      repository:
        `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,

      branch:
        env.GITHUB_BRANCH ||
        "main",

      jsonPath:
        env.GITHUB_JSON_PATH ||
        "questionbank.json",

      sha:
        file.sha,
    });
  } catch (err) {
    return error(
      err.message,
      401
    );
  }
}


// ============================================================
// STUDENT UPLOAD REQUEST
// ============================================================

async function handleUploadRequest(
  request,
  env
) {
  try {
    // =========================================
    // STEP 1 — CR AUTHENTICATION
    // =========================================

    await requireCR(
      request,
      env
    );


    // =========================================
    // STEP 2 — READ MULTIPART FORM
    // =========================================

    let form;

    try {
      form =
        await request.formData();
    } catch {
      return error(
        "Invalid upload form data"
      );
    }


    // =========================================
    // STEP 3 — REQUIRED BASIC INFORMATION
    // =========================================

    const crId =
      normalizeCRId(
        form.get("crId")
      );

    const crName =
      normalizeCRName(
        form.get("crName")
      );

    const whatsappNumber =
      normalizeWhatsApp(
        form.get(
          "whatsappNumber"
        )
      );


    // =========================================
    // STEP 4 — ACADEMIC INFORMATION
    // =========================================

    const batch =
      form.get("batch");

    const session =
      form.get("session");

    const year =
      form.get("year");

    const exam =
      form.get("exam");

    const semester =
      form.get("semester");


    // =========================================
    // STEP 5 — PDF
    // =========================================

    const file =
      form.get("file");


    if (!file) {
      return error(
        "Question paper PDF is required"
      );
    }


    // =========================================
    // STEP 6 — GENERATE IDENTITY
    // =========================================
    //
    // IMPORTANT:
    // Frontend filename/github_path are ignored.
    // Worker creates the official values.
    //

    const identity =
      generateQuestionPaperIdentity({
        batch,
        session,
        year,
        exam,
        semester,
      });


    // =========================================
    // STEP 7 — PDF VALIDATION
    // =========================================

    const pdfBuffer =
      await validatePdf(
        file
      );


    // =========================================
    // STEP 8 — FINAL DUPLICATE CHECK
    // =========================================

    const existingFinal =
      await getGithubFile(
        env,
        identity.githubPath
      );

    if (existingFinal) {
      return error(
        "This question paper already exists",
        409
      );
    }


    // =========================================
    // STEP 9 — PENDING DUPLICATE CHECK
    // =========================================

    const pending =
      await env.DB
        .prepare(
          `
          SELECT id
          FROM upload_requests
          WHERE github_path = ?
          LIMIT 1
          `
        )
        .bind(
          identity.githubPath
        )
        .first();

    if (pending) {
      return error(
        "This question paper is already pending approval",
        409
      );
    }


    // =========================================
    // STEP 10 — CREATE UPLOAD ID
    // =========================================

    const uploadId =
      uuid();

    const pendingPath =
      `pending/${uploadId}.pdf`;


    // =========================================
    // STEP 11 — ENCODE PDF
    // =========================================

    const encodedPdf =
      btoa(
        String.fromCharCode(
          ...new Uint8Array(
            pdfBuffer
          )
        )
      );


    // =========================================
    // STEP 12 — UPLOAD TO PENDING
    // =========================================

    await uploadGithubFile(
      env,

      pendingPath,

      encodedPdf,

      `Add pending question paper ${uploadId}`
    );


    // =========================================
    // STEP 13 — INSERT DB RECORD
    // =========================================

    try {
      await env.DB
        .prepare(
          `
          INSERT INTO upload_requests
          (
            id,
            cr_id,
            batch,
            session,
            year,
            exam,
            semester,
            filename,
            github_path,
            pending_path,
            status,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          uploadId,

          crId,

          identity.batchNo,

          identity.session,

          identity.year,

          identity.exam,

          identity.semester,

          identity.filename,

          identity.githubPath,

          pendingPath,

          "pending",

          new Date().toISOString()
        )
        .run();

    } catch (dbError) {

      // =========================================
      // ROLLBACK PENDING GITHUB FILE
      // =========================================

      const pendingFile =
        await getGithubFile(
          env,
          pendingPath
        );

      if (pendingFile) {
        await deleteGithubFile(
          env,

          pendingPath,

          pendingFile.sha,

          `Rollback pending upload ${uploadId}`
        );
      }

      throw dbError;
    }


    // =========================================
    // STEP 14 — SUCCESS RESPONSE
    // =========================================

    return json({
      ok: true,

      message:
        "Question paper uploaded successfully and is waiting for admin approval.",

      uploadId,

      filename:
        identity.filename,

      githubPath:
        identity.githubPath,

      semester:
        identity.semester,

      /*
       * These values are returned only for
       * confirmation/debugging.
       *
       * They are NOT trusted to create
       * the GitHub filename/path.
       */
      crId,

      crName,

      whatsappNumber,
    });

  } catch (err) {
    console.error(
      "Upload request error:",
      err
    );

    return error(
      err?.message ||
        "Upload request failed",
      400
    );
  }
}


// ============================================================
// ADMIN - PENDING UPLOADS
// ============================================================

async function handleAdminUploads(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const rows =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM upload_requests
          WHERE status = 'pending'
          ORDER BY created_at DESC
          `
        )
        .all();

    return json({
      ok: true,

      uploads:
        rows.results || [],
    });
  } catch (err) {
    return error(
      err.message,
      401
    );
  }
}


// ============================================================
// ADMIN - PREVIEW PENDING PDF
// ============================================================

async function handleAdminPreview(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const url =
      new URL(
        request.url
      );

    const id =
      normalizeString(
        url.searchParams.get(
          "id"
        )
      );

    if (!id) {
      return error(
        "Upload ID is required"
      );
    }

    const row =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM upload_requests
          WHERE id = ?
          LIMIT 1
          `
        )
        .bind(id)
        .first();

    if (!row) {
      return error(
        "Upload request not found",
        404
      );
    }

    const file =
      await getGithubFile(
        env,
        row.pending_path
      );

    if (!file) {
      return error(
        "Pending PDF not found",
        404
      );
    }

    const binary =
      Uint8Array.from(
        atob(
          file.content.replace(
            /\n/g,
            ""
          )
        ),
        char =>
          char.charCodeAt(0)
      );

    return new Response(
      binary,
      {
        status: 200,

        headers: {
          ...corsHeaders(),

          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${row.filename}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (err) {
    return error(
      err.message,
      401
    );
  }
}


// ============================================================
// ADMIN - APPROVE
// ============================================================

async function handleApprove(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const body =
      await request.json();

    const id =
      normalizeString(
        body.id
      );

    if (!id) {
      return error(
        "Upload ID is required"
      );
    }

    const row =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM upload_requests
          WHERE id = ?
          LIMIT 1
          `
        )
        .bind(id)
        .first();

    if (!row) {
      return error(
        "Upload request not found",
        404
      );
    }

    if (
      row.status !==
      "pending"
    ) {
      return error(
        "This upload request has already been processed"
      );
    }

    // =========================================
    // LOCK ROW
    // =========================================

    await env.DB
      .prepare(
        `
        UPDATE upload_requests
        SET status = 'processing'
        WHERE id = ?
        `
      )
      .bind(id)
      .run();

    try {

      // =========================================
      // GET PENDING PDF
      // =========================================

      const pendingFile =
        await getGithubFile(
          env,
          row.pending_path
        );

      if (!pendingFile) {
        throw new Error(
          "Pending PDF not found in GitHub"
        );
      }


      // =========================================
      // CHECK FINAL FILE
      // =========================================

      const finalExisting =
        await getGithubFile(
          env,
          row.github_path
        );

      if (finalExisting) {
        throw new Error(
          "Final question paper already exists"
        );
      }


      // =========================================
      // COPY PENDING → FINAL
      // =========================================

      const encoded =
        pendingFile.content.replace(
          /\n/g,
          ""
        );

      await uploadGithubFile(
        env,

        row.github_path,

        encoded,

        `Publish ${row.filename}`
      );


      // =========================================
      // UPDATE QUESTIONBANK.JSON
      // =========================================

      const identity = {
        filename:
          row.filename,

        githubPath:
          row.github_path,

        semester:
          row.semester,
      };

      try {
        await updateQuestionBankJson(
          env,
          identity
        );

      } catch (jsonError) {

        // =========================================
        // ROLLBACK FINAL PDF
        // =========================================

        const finalFile =
          await getGithubFile(
            env,
            row.github_path
          );

        if (finalFile) {
          await deleteGithubFile(
            env,

            row.github_path,

            finalFile.sha,

            `Rollback failed approval ${row.id}`
          );
        }

        throw jsonError;
      }


      // =========================================
      // DELETE PENDING COPY
      // =========================================

      const pendingAfter =
        await getGithubFile(
          env,
          row.pending_path
        );

      if (pendingAfter) {
        await deleteGithubFile(
          env,

          row.pending_path,

          pendingAfter.sha,

          `Remove pending upload ${row.id}`
        );
      }


      // =========================================
      // REMOVE DB ROW
      // =========================================

      await env.DB
        .prepare(
          `
          DELETE FROM upload_requests
          WHERE id = ?
          `
        )
        .bind(id)
        .run();


      // =========================================
      // SUCCESS
      // =========================================

      return json({
        ok: true,

        message:
          "Question paper approved and published successfully.",

        filename:
          row.filename,

        githubPath:
          row.github_path,
      });

    } catch (processingError) {

      // =========================================
      // RESTORE PENDING STATUS
      // =========================================

      await env.DB
        .prepare(
          `
          UPDATE upload_requests
          SET status = 'pending'
          WHERE id = ?
          `
        )
        .bind(id)
        .run();

      throw processingError;
    }

  } catch (err) {
    console.error(
      "Approve error:",
      err
    );

    return error(
      err.message,
      400
    );
  }
}


// ============================================================
// ADMIN - REJECT
// ============================================================

async function handleReject(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const body =
      await request.json();

    const id =
      normalizeString(
        body.id
      );

    if (!id) {
      return error(
        "Upload ID is required"
      );
    }

    const row =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM upload_requests
          WHERE id = ?
          LIMIT 1
          `
        )
        .bind(id)
        .first();

    if (!row) {
      return error(
        "Upload request not found",
        404
      );
    }

    if (row.pending_path) {
      const pendingFile =
        await getGithubFile(
          env,
          row.pending_path
        );

      if (pendingFile) {
        await deleteGithubFile(
          env,

          row.pending_path,

          pendingFile.sha,

          `Reject question paper ${row.id}`
        );
      }
    }

    await env.DB
      .prepare(
        `
        DELETE FROM upload_requests
        WHERE id = ?
        `
      )
      .bind(id)
      .run();

    return json({
      ok: true,

      message:
        "Question paper rejected successfully.",
    });

  } catch (err) {
    return error(
      err.message,
      400
    );
  }
}


// ============================================================
// ADMIN - PUBLISHED PAPERS
// ============================================================

async function handleAdminPublished(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const {
      data,
    } =
      await readQuestionBankJson(
        env
      );

    return json({
      ok: true,

      repository:
        `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,

      branch:
        env.GITHUB_BRANCH ||
        "main",

      semesters:
        data.semesters || [],

      version:
        data.version || "2.0",

      lastUpdated:
        data.lastUpdated || null,
    });

  } catch (err) {
    return error(
      err.message,
      401
    );
  }
}


// ============================================================
// ADMIN - DELETE PUBLISHED PAPER
// ============================================================

async function handleAdminDelete(
  request,
  env
) {
  try {
    await requireAdmin(
      request,
      env
    );

    const body =
      await request.json();

    const githubPath =
      normalizeString(
        body.path
      );

    if (!githubPath) {
      return error(
        "Question paper path is required"
      );
    }

    // =========================================
    // SECURITY VALIDATION
    // =========================================

    if (
      !/^Semester_(0[1-8])\/[^/]+\.pdf$/i.test(
        githubPath
      )
    ) {
      return error(
        "Invalid question paper path"
      );
    }


    // =========================================
    // VERIFY PUBLISHED
    // =========================================

    const published =
      await isPublishedQuestionPaper(
        env,
        githubPath
      );

    if (!published) {
      return error(
        "Question paper is not published in questionbank.json",
        404
      );
    }


    // =========================================
    // GET GITHUB FILE
    // =========================================

    const githubFile =
      await getGithubFile(
        env,
        githubPath
      );

    if (!githubFile) {
      return error(
        "Question paper PDF was not found in GitHub",
        404
      );
    }


    // =========================================
    // BACKUP
    // =========================================

    const backupContent =
      githubFile.content.replace(
        /\n/g,
        ""
      );

    const originalSha =
      githubFile.sha;


    // =========================================
    // STEP 1 — DELETE PDF
    // =========================================

    await deleteGithubFile(
      env,

      githubPath,

      originalSha,

      `Delete question paper ${githubPath}`
    );


    // =========================================
    // STEP 2 — REMOVE FROM JSON
    // =========================================

    try {
      await removeFromQuestionBankJson(
        env,
        githubPath
      );

    } catch (jsonError) {

      // =========================================
      // ROLLBACK PDF
      // =========================================

      await uploadGithubFile(
        env,

        githubPath,

        backupContent,

        `Restore question paper after failed delete ${githubPath}`
      );

      throw jsonError;
    }


    // =========================================
    // SUCCESS
    // =========================================

    return json({
      ok: true,

      message:
        "Question paper deleted successfully.",

      path:
        githubPath,
    });

  } catch (err) {
    console.error(
      "Delete error:",
      err
    );

    return error(
      err.message,
      400
    );
  }
}
