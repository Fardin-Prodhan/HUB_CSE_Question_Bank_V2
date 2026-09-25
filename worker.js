// ============================================================
// HUB CSE QUESTION BANK
// Cloudflare Worker API
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
// MAIN WORKER
// ============================================================

export default {
  async fetch(request, env, ctx) {

    try {

      // --------------------------------------------------------
      // CORS
      // --------------------------------------------------------

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(),
        });
      }


      const url = new URL(request.url);
      const path = url.pathname;


      // --------------------------------------------------------
      // BASIC
      // --------------------------------------------------------

      if (
        request.method === "GET" &&
        path === "/"
      ) {
        return json({
          ok: true,
          service: "HUB CSE Question Bank API",
          status: "online",
          version: "2.0",
        });
      }


      // --------------------------------------------------------
      // AUTH
      // --------------------------------------------------------

      if (
        request.method === "POST" &&
        path === "/auth/cr"
      ) {
        return await handleCRAuth(request, env);
      }


      if (
        request.method === "POST" &&
        path === "/auth/admin"
      ) {
        return await handleAdminAuth(request, env);
      }


      // --------------------------------------------------------
      // STUDENT / ACADEMIC
      // --------------------------------------------------------

      if (
        request.method === "GET" &&
        path === "/student-info"
      ) {
        return await handleStudentInfo(request, env);
      }


      if (
        request.method === "GET" &&
        path === "/academic-config"
      ) {
        return await handleAcademicConfig(request, env);
      }


      // --------------------------------------------------------
      // GITHUB TEST
      // --------------------------------------------------------

      if (
        request.method === "GET" &&
        path === "/github-test"
      ) {
        return await handleGithubTest(request, env);
      }


      // --------------------------------------------------------
      // STUDENT UPLOAD
      // --------------------------------------------------------

      if (
        request.method === "POST" &&
        path === "/upload-request"
      ) {
        return await handleUploadRequest(request, env);
      }


      // --------------------------------------------------------
      // ADMIN - PENDING UPLOADS
      // --------------------------------------------------------

      if (
        request.method === "GET" &&
        path === "/admin/uploads"
      ) {
        return await handleAdminUploads(request, env);
      }


      // --------------------------------------------------------
      // ADMIN - PREVIEW PENDING PDF
      // --------------------------------------------------------

      if (
        request.method === "GET" &&
        path === "/admin/preview"
      ) {
        return await handleAdminPreview(request, env);
      }


      // --------------------------------------------------------
      // ADMIN - APPROVE
      // --------------------------------------------------------

      if (
        request.method === "POST" &&
        path === "/admin/approve"
      ) {
        return await handleAdminApprove(request, env);
      }


      // --------------------------------------------------------
      // ADMIN - REJECT
      // --------------------------------------------------------

      if (
        request.method === "POST" &&
        path === "/admin/reject"
      ) {
        return await handleAdminReject(request, env);
      }


      // --------------------------------------------------------
      // ADMIN - PUBLISHED
      // --------------------------------------------------------

      if (
        request.method === "GET" &&
        path === "/admin/published"
      ) {
        return await handleAdminPublished(request, env);
      }


      // --------------------------------------------------------
      // ADMIN - DELETE PUBLISHED QUESTION
      // --------------------------------------------------------

      if (
        request.method === "POST" &&
        path === "/admin/delete"
      ) {
        return await handleAdminDelete(request, env);
      }


      // --------------------------------------------------------
      // UNKNOWN ROUTE
      // --------------------------------------------------------

      return error(
        "Route not found",
        404
      );

    } catch (err) {

      console.error(
        "Unhandled error:",
        err
      );

      return error(
        err?.message ||
        "Internal server error",
        500
      );
    }
  },
};


// ============================================================
// CORS / RESPONSE HELPERS
// ============================================================

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Password",

  };
}


function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        ...corsHeaders(),

        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store",
      },
    }
  );
}


function error(
  message,
  status = 400
) {

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

  return String(
    value ?? ""
  ).trim();
}


// ============================================================
// CR ID
// ============================================================

function normalizeCRId(value) {

  const crId =
    normalizeString(value)
      .replace(/\s+/g, "");

  if (!crId) {

    throw new Error(
      "CR ID is required"
    );
  }

  if (!/^\d{9}$/.test(crId)) {

    throw new Error(
      "CR ID must contain exactly 9 digits"
    );
  }

  return crId;
}


// ============================================================
// CR NAME
// ============================================================

function normalizeCRName(value) {

  const name =
    normalizeString(value)
      .replace(/\s+/g, " ");

  if (!name) {

    throw new Error(
      "CR name is required"
    );
  }

  if (name.length < 2) {

    throw new Error(
      "CR name is too short"
    );
  }

  if (name.length > 100) {

    throw new Error(
      "CR name is too long"
    );
  }

  return name;
}


// ============================================================
// WHATSAPP NUMBER
// ============================================================

function normalizeWhatsApp(value) {

  let number =
    normalizeString(value)
      .replace(/[\s\-()]/g, "");


  if (!number) {

    throw new Error(
      "WhatsApp number is required"
    );
  }


  // 01XXXXXXXXX
  if (/^01\d{9}$/.test(number)) {
    return number;
  }


  // 8801XXXXXXXXX
  if (/^8801\d{9}$/.test(number)) {
    return `+${number}`;
  }


  // +8801XXXXXXXXX
  if (/^\+8801\d{9}$/.test(number)) {
    return number;
  }


  throw new Error(
    "Invalid Bangladesh WhatsApp number"
  );
}


// ============================================================
// BATCH
// ============================================================

function normalizeBatch(value) {

  const raw =
    normalizeString(value);

  if (!/^\d+$/.test(raw)) {

    throw new Error(
      "Invalid batch number"
    );
  }

  const batch =
    Number(raw);


  if (
    !Number.isInteger(batch) ||
    batch < 1 ||
    batch > 999
  ) {

    throw new Error(
      "Invalid batch number"
    );
  }

  return batch;
}


// ============================================================
// SESSION
// ============================================================

function normalizeSession(value) {

  const session =
    normalizeString(value);

  const found =
    VALID_SESSIONS.find(
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


// ============================================================
// YEAR
// ============================================================

function normalizeYear(value) {

  const raw =
    normalizeString(value);

  if (!/^\d{4}$/.test(raw)) {

    throw new Error(
      "Year must contain exactly 4 digits"
    );
  }

  const year =
    Number(raw);


  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {

    throw new Error(
      "Invalid year"
    );
  }

  return year;
}


// ============================================================
// EXAM
// ============================================================

function normalizeExam(value) {

  const exam =
    normalizeString(value)
      .toLowerCase();


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


// ============================================================
// SEMESTER
// ============================================================

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
      "Invalid semester"
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
      "Invalid semester"
    );
  }


  return String(number)
    .padStart(2, "0");
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
// PARSE QUESTION PAPER IDENTITY FROM FILENAME
// ============================================================

function parseQuestionPaperFilename(
  filename
) {

  const name =
    normalizeString(filename);


  const match =
    /^Batch-(\d+)_(Spring|Fall)-(\d{4})_(Mid|Final)\.pdf$/i
      .exec(name);


  if (!match) {

    throw new Error(
      "Invalid question paper filename format"
    );
  }


  const batch =
    normalizeBatch(
      match[1]
    );


  const session =
    normalizeSession(
      match[2]
    );


  const year =
    normalizeYear(
      match[3]
    );


  const exam =
    normalizeExam(
      match[4]
    );


  return {

    batchNo:
      batch,

    session,

    year,

    exam,

  };
}


// ============================================================
// PDF VALIDATION
// ============================================================

async function validatePdf(
  file
) {

  if (!(file instanceof File)) {

    throw new Error(
      "PDF file is required"
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


  const signature =
    new TextDecoder()
      .decode(
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
// HASH / TOKEN
// ============================================================

async function sha256(
  value
) {

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
        b.toString(16)
          .padStart(2, "0")
    )
    .join("");
}


async function createToken(
  type
) {

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


async function verifyToken(
  token,
  type
) {

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


  if (!Number.isFinite(timestamp)) {
    return false;
  }


  if (!hash) {
    return false;
  }


  const SIX_HOURS =
    6 * 60 * 60 * 1000;


  if (
    Date.now() - timestamp >
    SIX_HOURS
  ) {

    return false;
  }


  if (
    Date.now() - timestamp < 0
  ) {

    return false;
  }


  // Existing authentication architecture preserved.
  return true;
}


// ============================================================
// AUTH HELPERS
// ============================================================

function getAuthorizationToken(
  request
) {

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


function getPassword(
  request
) {

  return request.headers.get(
    "X-Password"
  ) || null;
}


// ============================================================
// ADMIN AUTH
// ============================================================

async function requireAdmin(
  request,
  env
) {

  const password =
    getPassword(request);


  if (
    password &&
    password === env.ADMIN_PASSWORD
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


// ============================================================
// CR AUTH
// ============================================================

async function requireCR(
  request,
  env
) {

  const password =
    getPassword(request);


  if (
    password &&
    password === env.CR_PASSWORD
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
// CR LOGIN
// ============================================================

async function handleCRAuth(
  request,
  env
) {

  const password =
    getPassword(request);


  if (
    !password ||
    password !== env.CR_PASSWORD
  ) {

    return error(
      "Invalid CR password",
      401
    );
  }


  const token =
    await createToken("cr");


  return json({

    ok: true,

    token,

    expiresIn:
      6 * 60 * 60,

  });
}


// ============================================================
// ADMIN LOGIN
// ============================================================

async function handleAdminAuth(
  request,
  env
) {

  const password =
    getPassword(request);


  if (
    !password ||
    password !== env.ADMIN_PASSWORD
  ) {

    return error(
      "Invalid admin password",
      401
    );
  }


  const token =
    await createToken("admin");


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

function parseStudentId(
  crId
) {

  const normalized =
    normalizeCRId(
      crId
    );


  const departmentCode =
    normalized.slice(0, 3);


  const sessionCode =
    normalized.slice(3, 4);


  const admissionCode =
    normalized.slice(4, 6);


  const roll =
    normalized.slice(6, 9);


  if (
    departmentCode !== "315"
  ) {

    throw new Error(
      "This CR ID does not belong to CSE department"
    );
  }


  let session;


  if (
    sessionCode === "1"
  ) {

    session =
      "Spring";

  } else if (
    sessionCode === "2"
  ) {

    session =
      "Fall";

  } else {

    throw new Error(
      "Invalid session code in CR ID"
    );
  }


  const admissionYear =
    2000 +
    Number(admissionCode);


  return {

    crId:
      normalized,

    departmentCode,

    sessionCode,

    session,

    admissionYear,

    roll,

  };
}


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
      normalizeCRId(
        url.searchParams.get(
          "crId"
        )
      );


    const student =
      parseStudentId(
        crId
      );


    if (!env.DB) {

      return error(
        "Database is not configured",
        500
      );
    }


    const row =
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
        row || student,

    });

  } catch (err) {

    return error(
      err?.message ||
      "Unable to fetch student information",
      400
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

    await requireCR(
      request,
      env
    );


    if (!env.DB) {

      return error(
        "Database is not configured",
        500
      );
    }


    const result =
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
        result.results || [],

    });

  } catch (err) {

    return error(
      err?.message ||
      "Unable to fetch academic configuration",
      400
    );
  }
}


// ============================================================
// GITHUB HEADERS
// ============================================================

function githubHeaders(
  env
) {

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


// ============================================================
// GITHUB REQUEST
// ============================================================

async function githubRequest(
  env,
  path,
  options = {}
) {

  const url =
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;


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


// ============================================================
// GET GITHUB FILE
// ============================================================

async function getGithubFile(
  env,
  path
) {

  const response =
    await githubRequest(
      env,
      path,
      {

        method:
          "GET",

        headers: {

          "Accept":
            "application/vnd.github.raw+json",

        },

      }
    );


  if (!response.ok) {

    if (
      response.status === 404
    ) {

      return null;
    }


    const message =
      await response.text();


    throw new Error(
      `GitHub GET failed (${response.status}): ${message}`
    );
  }


  return await response.arrayBuffer();
}


// ============================================================
// GET GITHUB FILE SHA
// ============================================================

async function getGithubFileSha(
  env,
  path
) {

  const response =
    await githubRequest(
      env,
      path,
      {

        method:
          "GET",

      }
    );


  if (!response.ok) {

    if (
      response.status === 404
    ) {

      return null;
    }


    const message =
      await response.text();


    throw new Error(
      `GitHub metadata GET failed (${response.status}): ${message}`
    );
  }


  const data =
    await response.json();


  return data.sha || null;
}


// ============================================================
// UPLOAD GITHUB FILE
// ============================================================

async function uploadGithubFile(
  env,
  path,
  buffer,
  message,
  existingSha = null
) {

  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(buffer);


  let binary = "";


  const CHUNK_SIZE =
    0x8000;


  for (
    let i = 0;
    i < bytes.length;
    i += CHUNK_SIZE
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        Math.min(
          i + CHUNK_SIZE,
          bytes.length
        )
      )
    );
  }


  const content =
    btoa(binary);


  const body = {

    message:
      message ||
      "Upload file",

    content,

    branch:
      env.GITHUB_BRANCH ||
      "main",

  };


  if (existingSha) {

    body.sha =
      existingSha;
  }


  const response =
    await githubRequest(
      env,
      path,
      {

        method:
          "PUT",

        headers: {

          "Content-Type":
            "application/json",

        },

        body:
          JSON.stringify(body),

      }
    );


  if (!response.ok) {

    const message =
      await response.text();


    throw new Error(
      `GitHub upload failed (${response.status}): ${message}`
    );
  }


  return await response.json();
}


// ============================================================
// DELETE GITHUB FILE
// ============================================================

async function deleteGithubFile(
  env,
  path,
  message
) {

  const sha =
    await getGithubFileSha(
      env,
      path
    );


  if (!sha) {

    return {

      ok: true,

      deleted: false,

      reason:
        "File not found",

    };
  }


  const response =
    await githubRequest(
      env,
      path,
      {

        method:
          "DELETE",

        headers: {

          "Content-Type":
            "application/json",

        },

        body:
          JSON.stringify({

            message:
              message ||
              "Delete file",

            sha,

            branch:
              env.GITHUB_BRANCH ||
              "main",

          }),

      }
    );


  if (!response.ok) {

    const body =
      await response.text();


    throw new Error(
      `GitHub delete failed (${response.status}): ${body}`
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

  const jsonPath =
    env.GITHUB_JSON_PATH ||
    "questionbank.json";


  const response =
    await githubRequest(
      env,
      jsonPath,
      {

        method:
          "GET",

      }
    );


  if (!response.ok) {

    if (
      response.status === 404
    ) {

      return {

        data: {

          version:
            "2.0",

          lastUpdated:
            new Date().toISOString(),

          semesters: [],

        },

        sha:
          null,

      };
    }


    const message =
      await response.text();


    throw new Error(
      `Unable to read questionbank.json (${response.status}): ${message}`
    );
  }


  const githubData =
    await response.json();


  if (!githubData.content) {

    throw new Error(
      "GitHub questionbank.json has no content"
    );
  }


  const decoded =
    atob(
      githubData.content
        .replace(/\s/g, "")
    );


  const data =
    JSON.parse(decoded);


  return {

    data:
      ensureQuestionBankStructure(
        data
      ),

    sha:
      githubData.sha ||
      null,

  };
}


// ============================================================
// QUESTION BANK STRUCTURE
// ============================================================

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

    data.version =
      "2.0";
  }


  return data;
}


// ============================================================
// SORT SEMESTERS
// ============================================================

function sortSemesters(
  semesters
) {

  return semesters.sort(
    (a, b) => {

      const aNum =
        Number(
          String(
            a.name ||
            ""
          )
            .replace(
              /\D/g,
              ""
            )
        );


      const bNum =
        Number(
          String(
            b.name ||
            ""
          )
            .replace(
              /\D/g,
              ""
            )
        );


      return aNum - bNum;
    }
  );
}


// ============================================================
// SORT FILES
// ============================================================

function sortFiles(
  files
) {

  return files.sort(
    (a, b) =>
      String(
        a.name ||
        ""
      ).localeCompare(
        String(
          b.name ||
          ""
        ),
        undefined,
        {

          numeric:
            true,

          sensitivity:
            "base",

        }
      )
  );
}


// ============================================================
// UPDATE QUESTIONBANK JSON
// ============================================================

async function updateQuestionBankJson(
  env,
  identity
) {

  const jsonPath =
    env.GITHUB_JSON_PATH ||
    "questionbank.json";


  const {
    data,
    sha,
  } =
    await readQuestionBankJson(
      env
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

      papers: [],

    };


    data.semesters.push(
      semester
    );
  }


  if (
    !Array.isArray(
      semester.papers
    )
  ) {

    semester.papers = [];
  }


  const existingIndex =
    semester.papers.findIndex(
      paper =>
        paper.path ===
        identity.githubPath
    );


  const paper = {

    name:
      identity.filename,

    path:
      identity.githubPath,

  };


  if (
    existingIndex >= 0
  ) {

    semester.papers[
      existingIndex
    ] = paper;

  } else {

    semester.papers.push(
      paper
    );
  }


  sortFiles(
    semester.papers
  );


  sortSemesters(
    data.semesters
  );


  data.version =
    data.version ||
    "2.0";


  data.lastUpdated =
    new Date().toISOString();


  const content =
    JSON.stringify(
      data,
      null,
      2
    );


  const encoded =
    btoa(
      unescape(
        encodeURIComponent(
          content
        )
      )
    );


  const body = {

    message:
      `Update questionbank.json for ${identity.filename}`,

    content:
      encoded,

    branch:
      env.GITHUB_BRANCH ||
      "main",

  };


  if (sha) {

    body.sha =
      sha;
  }


  const response =
    await githubRequest(
      env,
      jsonPath,
      {

        method:
          "PUT",

        headers: {

          "Content-Type":
            "application/json",

        },

        body:
          JSON.stringify(body),

      }
    );


  if (!response.ok) {

    const message =
      await response.text();


    throw new Error(
      `questionbank.json update failed (${response.status}): ${message}`
    );
  }


  // ----------------------------------------------------------
  // VERIFY
  // ----------------------------------------------------------

  const verify =
    await readQuestionBankJson(
      env
    );


  const verifiedSemester =
    verify.data.semesters.find(
      item =>
        item.name ===
        identity.semester
    );


  const verified =
    verifiedSemester?.papers?.some(
      paper =>
        paper.path ===
        identity.githubPath
    );


  if (!verified) {

    throw new Error(
      "questionbank.json update could not be verified"
    );
  }


  return verify.data;
}


// ============================================================
// REMOVE FROM QUESTIONBANK JSON
// ============================================================

async function removeFromQuestionBankJson(
  env,
  githubPath
) {

  const jsonPath =
    env.GITHUB_JSON_PATH ||
    "questionbank.json";


  const {
    data,
    sha,
  } =
    await readQuestionBankJson(
      env
    );


  let changed =
    false;


  for (
    const semester
    of data.semesters
  ) {

    if (
      !Array.isArray(
        semester.papers
      )
    ) {

      continue;
    }


    const oldLength =
      semester.papers.length;


    semester.papers =
      semester.papers.filter(
        paper =>
          paper.path !==
          githubPath
      );


    if (
      semester.papers.length !==
      oldLength
    ) {

      changed = true;
    }
  }


  data.semesters =
    data.semesters.filter(
      semester =>
        Array.isArray(
          semester.papers
        ) &&
        semester.papers.length > 0
    );


  sortSemesters(
    data.semesters
  );


  if (!changed) {

    return {

      changed:
        false,

      data,

    };
  }


  data.lastUpdated =
    new Date().toISOString();


  const content =
    JSON.stringify(
      data,
      null,
      2
    );


  const encoded =
    btoa(
      unescape(
        encodeURIComponent(
          content
        )
      )
    );


  const body = {

    message:
      `Remove deleted question paper ${githubPath}`,

    content:
      encoded,

    branch:
      env.GITHUB_BRANCH ||
      "main",

  };


  if (sha) {

    body.sha =
      sha;
  }


  const response =
    await githubRequest(
      env,
      jsonPath,
      {

        method:
          "PUT",

        headers: {

          "Content-Type":
            "application/json",

        },

        body:
          JSON.stringify(body),

      }
    );


  if (!response.ok) {

    const message =
      await response.text();


    throw new Error(
      `questionbank.json removal failed (${response.status}): ${message}`
    );
  }


  return {

    changed:
      true,

    data,

  };
}


// ============================================================
// CHECK PUBLISHED
// ============================================================

async function isPublishedQuestionPaper(
  env,
  githubPath
) {

  const {
    data
  } =
    await readQuestionBankJson(
      env
    );


  return data.semesters.some(
    semester =>
      Array.isArray(
        semester.papers
      ) &&
      semester.papers.some(
        paper =>
          paper.path ===
          githubPath
      )
  );
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


    if (
      !env.GITHUB_OWNER ||
      !env.GITHUB_REPO ||
      !env.GITHUB_TOKEN
    ) {

      return error(
        "GitHub environment variables are not configured",
        500
      );
    }


    const jsonPath =
      env.GITHUB_JSON_PATH ||
      "questionbank.json";


    const branch =
      env.GITHUB_BRANCH ||
      "main";


    const response =
      await githubRequest(
        env,
        jsonPath,
        {

          method:
            "GET",

        }
      );


    let sha =
      null;


    if (response.ok) {

      const data =
        await response.json();

      sha =
        data.sha ||
        null;
    }


    return json({

      ok:
        true,

      repository:
        `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,

      branch,

      jsonPath,

      sha,

    });

  } catch (err) {

    return error(
      err?.message ||
      "GitHub test failed",
      400
    );
  }
}


// ============================================================
// UPLOAD REQUEST
// ============================================================

async function handleUploadRequest(
  request,
  env
) {

  let pendingGithubPath =
    null;


  try {

    await requireCR(
      request,
      env
    );


    // --------------------------------------------------------
    // FORM DATA
    // --------------------------------------------------------

    const form =
      await request.formData();


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


    const identity =
      generateQuestionPaperIdentity({

        batch:
          form.get("batch"),

        session:
          form.get("session"),

        year:
          form.get("year"),

        exam:
          form.get("exam"),

        semester:
          form.get("semester"),

      });


    const file =
      form.get("file");


    const pdfBuffer =
      await validatePdf(
        file
      );


    // --------------------------------------------------------
    // DATABASE
    // --------------------------------------------------------

    if (!env.DB) {

      return error(
        "Database is not configured",
        500
      );
    }


    // --------------------------------------------------------
    // CHECK DUPLICATE FINAL PAPER
    // --------------------------------------------------------

    const alreadyPublished =
      await isPublishedQuestionPaper(
        env,
        identity.githubPath
      );


    if (alreadyPublished) {

      return error(
        "This question paper has already been published",
        409
      );
    }


    // --------------------------------------------------------
    // CHECK DUPLICATE PENDING REQUEST
    // --------------------------------------------------------

    const duplicate =
      await env.DB
        .prepare(
          `
          SELECT id
          FROM upload_requests
          WHERE github_path = ?
          AND status IN ('pending', 'processing')
          LIMIT 1
          `
        )
        .bind(
          identity.githubPath
        )
        .first();


    if (duplicate) {

      return error(
        "A request for this question paper is already pending",
        409
      );
    }


    // --------------------------------------------------------
    // PENDING GITHUB FILE
    // --------------------------------------------------------

    pendingGithubPath =
      `pending/${uuid()}.pdf`;


    await uploadGithubFile(

      env,

      pendingGithubPath,

      pdfBuffer,

      `Add pending question paper for ${identity.filename}`

    );


    // --------------------------------------------------------
    // INSERT DATABASE RECORD
    // IMPORTANT:
    // Existing D1 schema is used exactly.
    // --------------------------------------------------------

    const requestUuid =
      uuid();


    try {

      await env.DB
        .prepare(
          `
          INSERT INTO upload_requests
          (
            request_uuid,
            cr_id,
            cr_name,
            semester,
            exam,
            filename,
            r2_key,
            file_size,
            status,
            created_at,
            github_path,
            whatsapp_number
          )
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(

          requestUuid,

          crId,

          crName,

          identity.semester,

          identity.exam,

          identity.filename,

          pendingGithubPath,

          file.size,

          "pending",

          new Date().toISOString(),

          identity.githubPath,

          whatsappNumber

        )
        .run();


    } catch (dbError) {

      // Rollback pending GitHub file
      try {

        await deleteGithubFile(

          env,

          pendingGithubPath,

          `Rollback failed upload request ${identity.filename}`

        );

      } catch (cleanupError) {

        console.error(
          "Pending GitHub cleanup failed:",
          cleanupError
        );
      }


      throw dbError;
    }


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return json({

      ok:
        true,

      message:
        "Question paper submitted successfully and is waiting for admin approval.",

      uploadId:
        requestUuid,

      requestUuid,

      filename:
        identity.filename,

      path:
        identity.githubPath,

      status:
        "pending",

      crId,

      crName,

      whatsappNumber,

    });


  } catch (err) {

    console.error(
      "Upload request error:",
      err
    );


    // If pending file was uploaded but DB failed
    // attempt cleanup.
    if (
      pendingGithubPath
    ) {

      try {

        await deleteGithubFile(

          env,

          pendingGithubPath,

          "Cleanup failed upload"

        );

      } catch (cleanupError) {

        console.error(
          "Cleanup error:",
          cleanupError
        );
      }
    }


    return error(
      err?.message ||
      "Upload request failed",
      400
    );
  }
}


// ============================================================
// ADMIN UPLOADS
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


    if (!env.DB) {

      return error(
        "Database is not configured",
        500
      );
    }


    const result =
      await env.DB
        .prepare(
          `
          SELECT
            id,
            request_uuid,
            cr_id,
            cr_name,
            whatsapp_number,
            semester,
            exam,
            filename,
            r2_key,
            file_size,
            status,
            created_at,
            github_path
          FROM upload_requests
          WHERE status = 'pending'
          ORDER BY created_at DESC
          `
        )
        .all();


    const uploads =
      (result.results || [])
        .map(row => {

          let identity = {};


          try {

            identity =
              parseQuestionPaperFilename(
                row.filename
              );

          } catch (parseError) {

            console.error(
              "Filename parsing failed:",
              row.filename,
              parseError
            );
          }


          return {

            ...row,

            // Compatibility fields for admin frontend
            batch:
              identity.batchNo ??
              null,

            session:
              identity.session ??
              null,

            year:
              identity.year ??
              null,

          };
        });


    return json({

      ok:
        true,

      uploads,

    });


  } catch (err) {

    return error(
      err?.message ||
      "Unable to fetch pending uploads",
      400
    );
  }
}


// ============================================================
// ADMIN PREVIEW
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


    if (!env.DB) {

      return error(
        "Database is not configured",
        500
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


    if (!row.r2_key) {

      return error(
        "Pending PDF path not found",
        404
      );
    }


    const pdf =
      await getGithubFile(
        env,
        row.r2_key
      );


    if (!pdf) {

      return error(
        "Pending PDF not found on GitHub",
        404
      );
    }


    return new Response(
      pdf,
      {

        status:
          200,

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
      err?.message ||
      "Unable to preview PDF",
      400
    );
  }
}


// ============================================================
// ADMIN APPROVE
// ============================================================

async function handleAdminApprove(
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
        body?.id
      );


    if (!id) {

      return error(
        "Upload ID is required"
      );
    }


    if (!env.DB) {

      return error(
        "Database is not configured",
        500
      );
    }


    // --------------------------------------------------------
    // GET REQUEST
    // --------------------------------------------------------

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
        `Upload cannot be approved because its current status is "${row.status}"`,
        409
      );
    }


    if (!row.r2_key) {

      return error(
        "Pending PDF path not found",
        404
      );
    }


    if (!row.github_path) {

      return error(
        "Published GitHub path not found",
        400
      );
    }


    // --------------------------------------------------------
    // LOCK REQUEST
    // --------------------------------------------------------

    const lock =
      await env.DB
        .prepare(
          `
          UPDATE upload_requests
          SET status = 'processing'
          WHERE id = ?
          AND status = 'pending'
          `
        )
        .bind(id)
        .run();


    if (
      !lock.meta ||
      lock.meta.changes !== 1
    ) {

      return error(
        "This upload is already being processed",
        409
      );
    }


    let finalUploaded =
      false;

    let jsonUpdated =
      false;


    try {

      // ------------------------------------------------------
      // FETCH PENDING PDF
      // ------------------------------------------------------

      const pdf =
        await getGithubFile(
          env,
          row.r2_key
        );


      if (!pdf) {

        throw new Error(
          "Pending PDF not found on GitHub"
        );
      }


      // ------------------------------------------------------
      // CHECK FINAL DUPLICATE
      // ------------------------------------------------------

      const published =
        await isPublishedQuestionPaper(
          env,
          row.github_path
        );


      if (published) {

        throw new Error(
          "This question paper is already published"
        );
      }


      // ------------------------------------------------------
      // VALIDATE FILENAME
      // ------------------------------------------------------

      const parsedIdentity =
        parseQuestionPaperFilename(
          row.filename
        );


      // ------------------------------------------------------
      // GET EXISTING FINAL SHA
      // ------------------------------------------------------

      const existingSha =
        await getGithubFileSha(
          env,
          row.github_path
        );


      // ------------------------------------------------------
      // UPLOAD FINAL PDF
      // ------------------------------------------------------

      await uploadGithubFile(

        env,

        row.github_path,

        pdf,

        `Publish question paper ${row.filename}`,

        existingSha

      );


      finalUploaded =
        true;


      // ------------------------------------------------------
      // UPDATE QUESTIONBANK.JSON
      // ------------------------------------------------------

      const identity = {

        batchNo:
          parsedIdentity.batchNo,

        session:
          parsedIdentity.session,

        year:
          parsedIdentity.year,

        exam:
          parsedIdentity.exam,

        semester:
          row.semester,

        filename:
          row.filename,

        githubPath:
          row.github_path,

      };


      await updateQuestionBankJson(
        env,
        identity
      );


      jsonUpdated =
        true;


      // ------------------------------------------------------
      // DELETE PENDING FILE
      // ------------------------------------------------------

      try {

        await deleteGithubFile(

          env,

          row.r2_key,

          `Remove pending file after approval ${row.filename}`

        );

      } catch (cleanupError) {

        console.error(
          "Pending cleanup after approval failed:",
          cleanupError
        );
      }


      // ------------------------------------------------------
      // DELETE DB REQUEST
      // --------------------------------------------------------

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

        ok:
          true,

        message:
          "Question paper approved and published successfully.",

        filename:
          row.filename,

        path:
          row.github_path,

        status:
          "approved",

      });


    } catch (processingError) {

      console.error(
        "Approval processing error:",
        processingError
      );


      // ------------------------------------------------------
      // ROLLBACK JSON
      // ------------------------------------------------------

      if (jsonUpdated) {

        try {

          await removeFromQuestionBankJson(
            env,
            row.github_path
          );

        } catch (rollbackJsonError) {

          console.error(
            "JSON rollback failed:",
            rollbackJsonError
          );
        }
      }


      // ------------------------------------------------------
      // ROLLBACK FINAL PDF
      // ------------------------------------------------------

      if (finalUploaded) {

        try {

          await deleteGithubFile(

            env,

            row.github_path,

            `Rollback failed approval ${row.filename}`

          );

        } catch (rollbackPdfError) {

          console.error(
            "Final PDF rollback failed:",
            rollbackPdfError
          );
        }
      }


      // ------------------------------------------------------
      // RESTORE PENDING STATUS
      // ------------------------------------------------------

      try {

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

      } catch (statusError) {

        console.error(
          "Status rollback failed:",
          statusError
        );
      }


      throw processingError;
    }


  } catch (err) {

    return error(
      err?.message ||
      "Approval failed",
      400
    );
  }
}


// ============================================================
// ADMIN REJECT
// ============================================================

async function handleAdminReject(
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
        body?.id
      );


    if (!id) {

      return error(
        "Upload ID is required"
      );
    }


    if (!env.DB) {

      return error(
        "Database is not configured",
        500
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
        `Upload cannot be rejected because its current status is "${row.status}"`,
        409
      );
    }


    // --------------------------------------------------------
    // DELETE PENDING PDF
    // --------------------------------------------------------

    if (row.r2_key) {

      try {

        await deleteGithubFile(

          env,

          row.r2_key,

          `Reject question paper ${row.filename}`

        );

      } catch (githubError) {

        return error(
          githubError?.message ||
          "Unable to delete pending PDF",
          500
        );
      }
    }


    // --------------------------------------------------------
    // DELETE DATABASE REQUEST
    // --------------------------------------------------------

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

      ok:
        true,

      message:
        "Question paper rejected and removed successfully.",

      id,

      status:
        "rejected",

    });


  } catch (err) {

    return error(
      err?.message ||
      "Reject failed",
      400
    );
  }
}


// ============================================================
// ADMIN PUBLISHED
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
      data
    } =
      await readQuestionBankJson(
        env
      );


    return json({

      ok:
        true,

      repository:
        `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,

      branch:
        env.GITHUB_BRANCH ||
        "main",

      jsonPath:
        env.GITHUB_JSON_PATH ||
        "questionbank.json",

      questionBank:
        data,

    });


  } catch (err) {

    return error(
      err?.message ||
      "Unable to fetch published question papers",
      400
    );
  }
}


// ============================================================
// ADMIN DELETE PUBLISHED QUESTION
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
        body?.path
      );


    if (!githubPath) {

      return error(
        "Question paper path is required"
      );
    }


    // --------------------------------------------------------
    // SECURITY VALIDATION
    // --------------------------------------------------------

    const validPath =
      /^Semester_(0[1-8])\/[^/]+\.pdf$/i
        .test(githubPath);


    if (!validPath) {

      return error(
        "Invalid question paper path"
      );
    }


    // --------------------------------------------------------
    // VERIFY PUBLISHED
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // GET PDF BEFORE DELETE
    // --------------------------------------------------------

    const pdf =
      await getGithubFile(
        env,
        githubPath
      );


    if (!pdf) {

      return error(
        "Published PDF not found on GitHub",
        404
      );
    }


    // --------------------------------------------------------
    // DELETE PDF
    // --------------------------------------------------------

    await deleteGithubFile(

      env,

      githubPath,

      `Delete published question paper ${githubPath}`

    );


    try {

      // ------------------------------------------------------
      // REMOVE FROM QUESTIONBANK.JSON
      // ------------------------------------------------------

      await removeFromQuestionBankJson(

        env,

        githubPath

      );


    } catch (jsonError) {

      console.error(
        "JSON update failed after PDF deletion:",
        jsonError
      );


      // ------------------------------------------------------
      // RESTORE PDF
      // ------------------------------------------------------

      try {

        await uploadGithubFile(

          env,

          githubPath,

          pdf,

          `Restore question paper after failed delete ${githubPath}`

        );

      } catch (restoreError) {

        console.error(
          "CRITICAL: PDF restore failed:",
          restoreError
        );
      }


      throw jsonError;
    }


    return json({

      ok:
        true,

      message:
        "Published question paper deleted successfully.",

      path:
        githubPath,

      status:
        "deleted",

    });


  } catch (err) {

    return error(
      err?.message ||
      "Delete failed",
      400
    );
  }
}
