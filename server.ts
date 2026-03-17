import bcrypt from 'bcryptjs';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { jsPDF } from "jspdf";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("redup.db");

// Ensure PDF storage directory exists
const pdfDir = path.join(__dirname, "public", "pdfs");
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

const generateEssayPDF = (essayId: any, result: any, themeTitle: string, total_score: number) => {
  try {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Relatório de Desempenho REDUP", 20, 20);
    doc.setFontSize(12);
    doc.text(`Tema: ${themeTitle}`, 20, 30);
    doc.text(`Nota Total: ${total_score}`, 20, 40);
    doc.text("Feedback Geral:", 20, 50);
    const feedbackText = result.feedback || result.general || '';
    const splitFeedback = doc.splitTextToSize(feedbackText, 170);
    doc.text(splitFeedback, 20, 60);

    const fileName = `essay_${essayId}_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    
    const pdfOutput = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfOutput));
    
    return `/pdfs/${fileName}`;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return null;
  }
};

// Database Migrations
try {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending'");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN admin_master INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE materials ADD COLUMN visibility TEXT DEFAULT 'private'");
} catch (e) {}

try {
  db.exec("ALTER TABLE essays ADD COLUMN correction_mode TEXT DEFAULT 'full'");
} catch (e) {}

try {
  db.exec("ALTER TABLE essays ADD COLUMN status TEXT DEFAULT 'completed'");
} catch (e) {}

try {
  db.exec("ALTER TABLE essays ADD COLUMN pdf_url TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE essays ADD COLUMN plagiarism_check TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE essays ADD COLUMN error_message TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE themes ADD COLUMN category TEXT DEFAULT 'Geral'");
} catch (e) {}

try {
  db.exec("ALTER TABLE themes ADD COLUMN is_active INTEGER DEFAULT 1");
} catch (e) {}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    status TEXT DEFAULT 'pending',
    admin_master INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Geral',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS essays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    theme_id INTEGER,
    content TEXT NOT NULL,
    correction_mode TEXT DEFAULT 'full',
    score_c1 INTEGER,
    score_c2 INTEGER,
    score_c3 INTEGER,
    score_c4 INTEGER,
    score_c5 INTEGER,
    total_score INTEGER,
    feedback TEXT,
    plagiarism_check TEXT,
    status TEXT DEFAULT 'completed',
    pdf_url TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS paragraphs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    essay_id INTEGER,
    content TEXT NOT NULL,
    feedback TEXT,
    paragraph_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(essay_id) REFERENCES essays(id)
  );

  CREATE TABLE IF NOT EXISTS reinforcement_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    competency INTEGER,
    status TEXT DEFAULT 'active',
    exercises_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    target_date DATE,
    goals_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS generated_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    week_number INTEGER,
    day_of_week TEXT,
    competency INTEGER,
    type TEXT,
    content_json TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exercise_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER,
    student_id INTEGER,
    student_answer TEXT,
    feedback_json TEXT,
    mastery_level INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(exercise_id) REFERENCES generated_exercises(id),
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    week_number INTEGER,
    structure_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS admin_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT,
    criteria_competencies TEXT,
    repertoire_pdf_url TEXT,
    material_autoral TEXT,
    weights TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    competency INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT,
    tags TEXT,
    visibility TEXT DEFAULT 'private',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS correction_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    essay_id INTEGER,
    step TEXT NOT NULL,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(essay_id) REFERENCES essays(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('logo_url', '/logo.png');

  -- Seed Data
  INSERT OR IGNORE INTO themes (id, title, description, category, is_active) VALUES 
  (1, 'Os impactos da inteligência artificial na educação brasileira', 'Discuta como as novas tecnologias estão transformando o ambiente escolar.', 'Temas Sociais Brasileiros', 1),
  (2, 'Caminhos para combater a insegurança alimentar no Brasil', 'Analise as causas e possíveis soluções para a fome no país.', 'Temas Sociais Brasileiros', 1),
  (3, 'Caminhos para resolver a questão do analfabetismo no Brasil', 'Analise os desafios e proponha soluções para o analfabetismo no país.', 'Temas Sociais Brasileiros', 1),
  (4, 'O excesso de lixo no cenário brasileiro e os problemas para o meio ambiente', 'Discuta a gestão de resíduos e seus impactos ambientais.', 'Temas Sociais Brasileiros', 1),
  (5, 'A necessidade de preservação e recuperação dos biomas naturais brasileiros', 'Aborde a importância da biodiversidade e os riscos de degradação.', 'Temas Sociais Brasileiros', 1),
  (6, 'Desafios para a proteção da população LGBTQIAP+', 'Analise a violência e a discriminação contra essa população no Brasil.', 'Temas Sociais Brasileiros', 1),
  (7, 'Os desafios para a doação de sangue na sociedade brasileira', 'Discuta as barreiras culturais e estruturais para a doação de sangue.', 'Temas Sociais Brasileiros', 1),
  (8, 'As manifestações de violência dentro dos estádios brasileiros de futebol', 'Analise as causas da violência no esporte e caminhos para a paz.', 'Temas Sociais Brasileiros', 1),
  (9, 'O problema do déficit habitacional no Brasil', 'Discuta a falta de moradia digna e as políticas públicas necessárias.', 'Temas Sociais Brasileiros', 1),
  (10, 'Os desafios do combate à arquitetura hostil na sociedade brasileira', 'Analise como o design urbano pode excluir populações vulneráveis.', 'Temas Sociais Brasileiros', 1),
  (11, 'Os problemas relacionados ao analfabetismo digital no Brasil', 'Discuta a exclusão digital e a importância da alfabetização tecnológica.', 'Temas Sociais Brasileiros', 1);

  INSERT OR IGNORE INTO materials (id, title, content, type) VALUES 
  (1, 'Guia de Estrutura REDUP', 'A redação deve conter 4 parágrafos: Introdução (Tese), Desenvolvimento 1, Desenvolvimento 2 e Conclusão (Proposta). A tese deve ser clara e apresentar dois problemas a serem discutidos.', 'Guia Estrutural');

  -- Master Admin Seed
  INSERT OR IGNORE INTO users (id, name, email, password, role, status, admin_master) VALUES 
  (1, 'Admin REDUP', 'admin@redup.com', 'admin123', 'admin', 'approved', 1);
  
  -- Student Test Seed
  INSERT OR IGNORE INTO users (id, name, email, password, role, status, admin_master) VALUES 
  (2, 'Aluno Teste', 'aluno@teste.com', 'aluno123', 'student', 'approved', 0);
  
  -- Ensure admin is approved and master if already exists
  UPDATE users SET status = 'approved', role = 'admin', admin_master = 1 WHERE email = 'admin@redup.com';
  UPDATE users SET status = 'approved' WHERE email = 'aluno@teste.com';
`);

// Reset/Hash admin password to ensure 'admin123' works
const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@redup.com'").get() as any;
if (admin) {
  const defaultPassword = 'admin123';
  const isCorrectPassword = bcrypt.compareSync(defaultPassword, admin.password);
  if (!isCorrectPassword) {
    const hashed = bcrypt.hashSync(defaultPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, admin.id);
  }
}

// Reset/Hash student password to ensure 'aluno123' works
const student = db.prepare("SELECT * FROM users WHERE email = 'aluno@teste.com'").get() as any;
if (student) {
  const defaultPassword = 'aluno123';
  const isCorrectPassword = bcrypt.compareSync(defaultPassword, student.password);
  if (!isCorrectPassword) {
    const hashed = bcrypt.hashSync(defaultPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, student.id);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/pdfs', express.static(pdfDir));

  // Auth Endpoints
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    
    // REGRA CRÍTICA: Apenas contas do tipo aluno podem ser criadas pelo sistema.
    const role = 'student';
    const status = 'pending';
    const admin_master = 0;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (name, email, password, role, status, admin_master) VALUES (?, ?, ?, ?, ?, ?)");
      const info = stmt.run(name, email, hashedPassword, role, status, admin_master);
      res.json({ id: info.lastInsertRowid, name, email, role, status, admin_master });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (user && await bcrypt.compare(password, user.password)) {
      if (user.role === 'student' && user.status !== 'approved') {
        return res.status(403).json({ error: "Sua conta está aguardando aprovação." });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Admin Route Protection Middleware
  const adminGuard = (req: any, res: any, next: any) => {
    const userId = req.body.admin_id || req.query.admin_id || req.body.user_id || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user || user.role !== 'admin' || user.admin_master !== 1) {
      return res.status(403).json({ error: "Acesso negado. Apenas o administrador master pode realizar esta ação." });
    }
    next();
  };

  // Themes
  app.get("/api/themes", (req, res) => {
    const studentId = req.query.student_id;
    let themes;
    if (studentId) {
      themes = db.prepare(`
        SELECT t.*, 
               (SELECT COUNT(*) FROM essays e WHERE e.theme_id = t.id AND e.student_id = ? AND e.status = 'concluida') as completed_count
        FROM themes t 
        WHERE t.is_active = 1 
        ORDER BY t.category ASC, t.created_at DESC
      `).all(studentId);
    } else {
      themes = db.prepare("SELECT * FROM themes WHERE is_active = 1 ORDER BY category ASC, created_at DESC").all();
    }
    res.json(themes);
  });

  app.post("/api/themes", adminGuard, (req, res) => {
    const { title, description, category } = req.body;
    const stmt = db.prepare("INSERT INTO themes (title, description, category) VALUES (?, ?, ?)");
    const info = stmt.run(title, description, category || 'Geral');
    res.json({ id: info.lastInsertRowid, title, description, category: category || 'Geral' });
  });

  // Essays
  app.get("/api/essays/:studentId", (req, res) => {
    const essays = db.prepare("SELECT * FROM essays WHERE student_id = ? ORDER BY created_at DESC").all(req.params.studentId);
    res.json(essays);
  });

  // Evolution Monitoring Logic
  const updateEvolutionMonitoring = (student_id: number) => {
    console.log(`[DEBUG] Updating evolution monitoring for student ${student_id}`);
    const lastEssays = db.prepare(`
      SELECT score_c1, score_c2, score_c3, score_c4, score_c5 
      FROM essays 
      WHERE student_id = ? AND status = 'concluida'
      ORDER BY created_at DESC 
      LIMIT 3
    `).all(student_id) as any[];

    if (lastEssays.length === 3) {
      const competencies = ['c1', 'c2', 'c3', 'c4', 'c5'];
      competencies.forEach((comp, idx) => {
        const key = `score_${comp}`;
        const lowScores = lastEssays.every(e => e[key] < 160);
        if (lowScores) {
          console.log(`[DEBUG] Low scores detected for student ${student_id} in Competency ${idx + 1}`);
          const existing = db.prepare("SELECT id FROM reinforcement_modules WHERE student_id = ? AND competency = ? AND status = 'active'").get(student_id, idx + 1);
          if (!existing) {
            db.prepare("INSERT INTO reinforcement_modules (student_id, competency) VALUES (?, ?)").run(student_id, idx + 1);
          }
        }
      });
    }
  };

  app.post("/api/essays", (req, res) => {
    const { student_id, theme_id, content, correction_mode } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO essays (student_id, theme_id, content, correction_mode, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        student_id, 
        theme_id, 
        content || '', 
        correction_mode || 'full', 
        'processando'
      );
      const essayId = info.lastInsertRowid;

      db.prepare("INSERT INTO correction_logs (essay_id, step, message) VALUES (?, ?, ?)")
        .run(essayId, 'INICIO', 'Redação salva com status processando');

      res.json({ id: essayId, status: 'processando' });
    } catch (saveErr: any) {
      console.error(`[ERROR] Failed to save initial essay:`, saveErr);
      res.status(500).json({ error: "Erro ao salvar redação", details: saveErr.message });
    }
  });

  app.post("/api/essays/paragraph", (req, res) => {
    const { essay_id, student_id, theme_id, content, feedback, paragraph_order } = req.body;
    
    let currentEssayId = essay_id;
    
    if (!currentEssayId) {
      const stmt = db.prepare(`
        INSERT INTO essays (student_id, theme_id, content, correction_mode, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(student_id, theme_id, content, 'paragrafos', 'em_andamento');
      currentEssayId = info.lastInsertRowid;
      
      // Audit Log for starting a new essay
      db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)")
        .run(student_id, 'START_ESSAY', `Started essay ID ${currentEssayId} in paragraph mode`);
    } else {
      // Update main essay content (append or update)
      const essay = db.prepare("SELECT content FROM essays WHERE id = ?").get(currentEssayId) as any;
      const newContent = essay.content ? (essay.content + "\n\n" + content) : content;
      db.prepare("UPDATE essays SET content = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?").run(newContent, currentEssayId);
    }
    
    // Save to paragraphs table
    const pStmt = db.prepare(`
      INSERT INTO paragraphs (essay_id, content, feedback, paragraph_order)
      VALUES (?, ?, ?, ?)
    `);
    pStmt.run(currentEssayId, content, feedback, paragraph_order);
    
    res.json({ essay_id: currentEssayId });
  });

  app.get("/api/essays/:essayId/paragraphs", (req, res) => {
    const paragraphs = db.prepare("SELECT * FROM paragraphs WHERE essay_id = ? ORDER BY paragraph_order ASC").all(req.params.essayId);
    res.json(paragraphs);
  });

  app.post("/api/essays/:id/generate-pdf", (req, res) => {
    const { id } = req.params;
    try {
      const essay = db.prepare("SELECT * FROM essays WHERE id = ?").get(id) as any;
      if (!essay) return res.status(404).json({ error: "Redação não encontrada" });
      
      const theme = db.prepare("SELECT title FROM themes WHERE id = ?").get(essay.theme_id) as any;
      const themeTitle = theme ? theme.title : 'Tema Próprio';
      
      const feedback = JSON.parse(essay.feedback);
      const pdfUrl = generateEssayPDF(id, feedback, themeTitle, essay.total_score);
      
      if (pdfUrl) {
        db.prepare("UPDATE essays SET pdf_url = ? WHERE id = ?").run(pdfUrl, id);
        res.json({ success: true, pdf_url: pdfUrl });
      } else {
        res.status(500).json({ error: "Falha ao gerar PDF" });
      }
    } catch (error) {
      console.error("Erro na regeneração de PDF:", error);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/essays/:id/context", (req, res) => {
    const { id } = req.params;
    const essay = db.prepare("SELECT * FROM essays WHERE id = ?").get(id) as any;
    if (!essay) return res.status(404).json({ error: "Redação não encontrada" });

    const theme = db.prepare("SELECT title FROM themes WHERE id = ?").get(essay.theme_id) as any;
    const materials = db.prepare("SELECT * FROM materials WHERE visibility = 'private'").all() as any[];
    const adminParams = db.prepare("SELECT * FROM admin_parameters ORDER BY updated_at DESC LIMIT 1").get() as any;

    res.json({
      themeTitle: theme ? theme.title : 'Tema Próprio',
      materials,
      adminParams
    });
  });

  app.post("/api/essays/:id/save-results", (req, res) => {
    const { id } = req.params;
    const { result } = req.body;
    
    try {
      const essay = db.prepare("SELECT * FROM essays WHERE id = ?").get(id) as any;
      if (!essay) return res.status(404).json({ error: "Redação não encontrada" });

      const theme = db.prepare("SELECT title FROM themes WHERE id = ?").get(essay.theme_id) as any;
      const themeTitle = theme ? theme.title : 'Tema Próprio';

      const scores = result.scores || { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
      const c1 = scores.c1 ?? 0;
      const c2 = scores.c2 ?? 0;
      const c3 = scores.c3 ?? 0;
      const c4 = scores.c4 ?? 0;
      const c5 = scores.c5 ?? 0;
      const total_score = c1 + c2 + c3 + c4 + c5;

      const feedbackText = result.feedback || 'Sem feedback disponível';
      const justifications = result.justifications || { c1: '', c2: '', c3: '', c4: '', c5: '' };

      const feedbackJson = JSON.stringify({
        general: feedbackText,
        justifications: justifications,
        paragraph_comments: result.paragraph_comments || [],
        periods: result.periods || [],
        repertoire_analysis: result.repertoire_analysis || [],
        mind_map: result.mind_map || { center: themeTitle, nodes: [] },
        radar_data: result.radar_data || [],
        tips: result.tips || [],
        reinforcement_exercises: result.reinforcement_exercises || []
      });

      db.prepare(`
        UPDATE essays 
        SET score_c1 = ?, score_c2 = ?, score_c3 = ?, score_c4 = ?, score_c5 = ?, 
            total_score = ?, feedback = ?, plagiarism_check = ?, status = 'concluida', 
            created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(c1, c2, c3, c4, c5, total_score, feedbackJson, result.plagiarism_check || '', id);

      // Gerar PDF
      try {
        const pdfUrl = generateEssayPDF(id, result, themeTitle, total_score);
        if (pdfUrl) {
          db.prepare("UPDATE essays SET pdf_url = ? WHERE id = ?").run(pdfUrl, id);
        }
      } catch (pdfErr) {}

      // Módulo de Reforço
      if (result.reinforcement_exercises && result.reinforcement_exercises.length > 0) {
        const scoreList = [c1, c2, c3, c4, c5];
        const minScore = Math.min(...scoreList);
        const compIdx = scoreList.indexOf(minScore) + 1;

        db.prepare(`
          INSERT INTO reinforcement_modules (student_id, competency, exercises_json, status)
          VALUES (?, ?, ?, ?)
        `).run(essay.student_id, compIdx, JSON.stringify(result.reinforcement_exercises), 'active');
      }

      updateEvolutionMonitoring(essay.student_id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/essays/:id/save-error", (req, res) => {
    const { id } = req.params;
    const { error } = req.body;
    db.prepare("UPDATE essays SET status = 'erro', error_message = ? WHERE id = ?").run(error, id);
    res.json({ success: true });
  });

  app.post("/api/essays/finalize", (req, res) => {
    const { essay_id } = req.body;
    
    try {
      db.prepare("UPDATE essays SET status = 'processando' WHERE id = ?").run(essay_id);
      
      db.prepare("INSERT INTO correction_logs (essay_id, step, message) VALUES (?, ?, ?)")
        .run(essay_id, 'FINALIZE_INICIO', 'Finalização iniciada, status processando');

      res.json({ success: true, essayId: essay_id, status: 'processando' });
    } catch (err: any) {
      console.error(`[ERROR] Failed to finalize essay ${essay_id}:`, err);
      res.status(500).json({ error: "Erro ao finalizar redação", details: err.message });
    }
  });

  app.post("/api/essays/:id/retry", (req, res) => {
    const { id } = req.params;
    
    try {
      const essay = db.prepare("SELECT * FROM essays WHERE id = ?").get(id) as any;
      if (!essay) return res.status(404).json({ error: "Redação não encontrada" });

      db.prepare("UPDATE essays SET status = 'processando', error_message = NULL WHERE id = ?").run(id);
      res.json({ success: true, status: 'processando' });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao reiniciar correção", details: err.message });
    }
  });

  // Reinforcement Modules
  app.get("/api/reinforcement/:studentId", (req, res) => {
    const modules = db.prepare("SELECT * FROM reinforcement_modules WHERE student_id = ? ORDER BY created_at DESC").all(req.params.studentId);
    res.json(modules);
  });

  app.post("/api/reinforcement/complete", (req, res) => {
    const { module_id } = req.body;
    db.prepare("UPDATE reinforcement_modules SET status = 'completed' WHERE id = ?").run(module_id);
    res.json({ success: true });
  });

  app.post("/api/reinforcement/save-exercises", (req, res) => {
    const { module_id, exercises_json } = req.body;
    db.prepare("UPDATE reinforcement_modules SET exercises_json = ? WHERE id = ?").run(exercises_json, module_id);
    res.json({ success: true });
  });

  // Study Plans
  app.get("/api/study-plan/:studentId", (req, res) => {
    const plan = db.prepare("SELECT * FROM study_plans WHERE student_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.studentId);
    res.json(plan || null);
  });

  app.post("/api/study-plan", (req, res) => {
    const { student_id, target_date, goals_json } = req.body;
    db.prepare("INSERT INTO study_plans (student_id, target_date, goals_json) VALUES (?, ?, ?)").run(student_id, target_date, goals_json);
    res.json({ success: true });
  });

  // Exercises Endpoints
  app.get("/api/exercises/context/:student_id", (req, res) => {
    const { student_id } = req.params;
    const lastEssays = db.prepare(`
      SELECT score_c1, score_c2, score_c3, score_c4, score_c5, feedback 
      FROM essays 
      WHERE student_id = ? AND status = 'concluida'
      ORDER BY created_at DESC 
      LIMIT 3
    `).all(student_id) as any[];
    res.json({ lastEssays });
  });

  app.post("/api/exercises/save", (req, res) => {
    const { student_id, week_number, day_of_week, competency, type, content_json } = req.body;
    const stmt = db.prepare(`
      INSERT INTO generated_exercises (student_id, week_number, day_of_week, competency, type, content_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(student_id, week_number, day_of_week, competency, type, content_json);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/exercises/:student_id/:week/:day", (req, res) => {
    const { student_id, week, day } = req.params;
    const existing = db.prepare(`
      SELECT * FROM generated_exercises 
      WHERE student_id = ? AND week_number = ? AND day_of_week = ?
    `).get(student_id, week, day) as any;
    
    if (existing) {
      return res.json(existing);
    }
    res.status(404).json({ error: "Exercícios não encontrados" });
  });

  app.post("/api/exercises/submit", (req, res) => {
    const { exercise_id, student_id, student_answer, feedback_json, mastery_level } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO exercise_performance (exercise_id, student_id, student_answer, feedback_json, mastery_level)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(exercise_id, student_id, JSON.stringify(student_answer), JSON.stringify(feedback_json), mastery_level);
      
      db.prepare("UPDATE generated_exercises SET status = 'completed' WHERE id = ?").run(exercise_id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao salvar desempenho:", error);
      res.status(500).json({ error: "Erro ao salvar desempenho" });
    }
  });

  // Admin Parameters
  app.get("/api/admin/parameters", adminGuard, (req, res) => {
    const params = db.prepare("SELECT * FROM admin_parameters ORDER BY updated_at DESC LIMIT 1").get();
    res.json(params || {});
  });

  app.post("/api/admin/parameters", adminGuard, (req, res) => {
    const { version, criteria_competencies, repertoire_pdf_url, material_autoral, weights } = req.body;
    const stmt = db.prepare(`
      INSERT INTO admin_parameters (version, criteria_competencies, repertoire_pdf_url, material_autoral, weights)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(version, criteria_competencies, repertoire_pdf_url, material_autoral, weights);
    res.json({ success: true });
  });

  // Exercises
  app.get("/api/exercises", (req, res) => {
    const exercises = db.prepare("SELECT * FROM exercises").all();
    res.json(exercises);
  });

  app.post("/api/exercises", adminGuard, (req, res) => {
    const { title, content, competency } = req.body;
    const stmt = db.prepare("INSERT INTO exercises (title, content, competency) VALUES (?, ?, ?)");
    const info = stmt.run(title, content, competency);
    res.json({ id: info.lastInsertRowid });
  });

  // Materials
  app.get("/api/materials", (req, res) => {
    const materials = db.prepare("SELECT * FROM materials").all();
    res.json(materials);
  });

  app.post("/api/materials", adminGuard, (req, res) => {
    const { title, content, type, tags, visibility, user_id } = req.body;
    
    const stmt = db.prepare("INSERT INTO materials (title, content, type, tags, visibility) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(title, content, type, tags, visibility || 'private');
    
    // Audit Log
    db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)")
      .run(user_id, 'ADD_MATERIAL', `Material: ${title} (Tags: ${tags}, Visibility: ${visibility})`);
      
    res.json({ id: info.lastInsertRowid, title, content, type, tags, visibility: visibility || 'private' });
  });

  app.post("/api/admin/log-unauthorized", (req, res) => {
    const { user_id, action, details } = req.body;
    db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)")
      .run(user_id, action, details);
    res.json({ success: true });
  });

  // Admin: All Students
  app.get("/api/admin/students", adminGuard, (req, res) => {
    const students = db.prepare("SELECT id, name, email, role, status, admin_master FROM users WHERE role = 'student'").all();
    const studentsWithStats = students.map((s: any) => {
      const stats = db.prepare(`
        SELECT AVG(total_score) as avg_score, COUNT(*) as essay_count 
        FROM essays WHERE student_id = ?
      `).get(s.id) as any;
      return { ...s, ...stats };
    });
    res.json(studentsWithStats);
  });

  app.post("/api/admin/approve-user", adminGuard, (req, res) => {
    const { user_id, status, admin_id } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, user_id);
    
    db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)")
      .run(admin_id, 'USER_APPROVAL', `User ID ${user_id} set to ${status}`);
      
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = (settings as any[]).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(settingsObj);
  });

  app.post("/api/settings", adminGuard, (req, res) => {
    const { key, value, user_id } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Admin: Logs
  app.get("/api/admin/logs", adminGuard, (req, res) => {
    const logs = db.prepare(`
      SELECT audit_logs.*, users.name as user_name 
      FROM audit_logs 
      LEFT JOIN users ON audit_logs.user_id = users.id 
      ORDER BY audit_logs.created_at DESC 
      LIMIT 50
    `).all();
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Admin Dashboard Stats
  app.get("/api/admin/stats", adminGuard, (req, res) => {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any;
    const pendingStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'pending'").get() as any;
    const totalEssays = db.prepare("SELECT COUNT(*) as count FROM essays").get() as any;
    const avgScore = db.prepare("SELECT AVG(total_score) as avg FROM essays WHERE status = 'concluida'").get() as any;
    
    res.json({
      totalStudents: totalStudents.count,
      pendingStudents: pendingStudents.count,
      totalEssays: totalEssays.count,
      avgScore: Math.round(avgScore.avg || 0)
    });
  });

  // Study Plan Auto-Check
  app.get("/api/check-study-plan/:student_id", (req, res) => {
    const { student_id } = req.params;
    const plan = db.prepare("SELECT id FROM study_plans WHERE student_id = ?").get(student_id);
    
    if (!plan) {
      console.log(`[DEBUG] Auto-generating study plan for student ${student_id}`);
      // Default structure for 12 weeks
      const goals = [];
      const enemDate = new Date(2026, 10, 8);
      for (let i = 0; i < 12; i++) {
        goals.push({
          week: i + 1,
          date: `Semana ${i + 1}`,
          tasks: [
            { id: 1, day: 'Segunda', title: 'Revisão gramatical', completed: false, type: 'exercise' },
            { id: 2, day: 'Terça', title: 'Sinônimos e variação', completed: false, type: 'exercise' },
            { id: 3, day: 'Quarta', title: 'Treino de repertório', completed: false, type: 'exercise' },
            { id: 4, day: 'Quinta', title: 'Aprofundamento argumentativo', completed: false, type: 'exercise' },
            { id: 5, day: 'Sexta', title: 'Construção de teses', completed: false, type: 'exercise' },
            { id: 6, day: 'Sábado', title: 'Redação completa', completed: false, type: 'exercise' },
            { id: 7, day: 'Domingo', title: 'Revisão ativa', completed: false, type: 'exercise' }
          ]
        });
      }
      db.prepare("INSERT INTO study_plans (student_id, target_date, goals_json) VALUES (?, ?, ?)").run(
        student_id, 
        '2026-11-08', 
        JSON.stringify(goals)
      );
    }
    res.json({ success: true });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
