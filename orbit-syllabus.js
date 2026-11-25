/* OrbitSchool Syllabus data — JKBOSE & CBSE, Classes 1–12.
   Checked 22 Nov 2026 against public reports of the CBSE Curriculum 2026-27 and JKBOSE 2026-27 notices.
   Subject lists are a guide; the official PDFs always win. Chapter lists are added only where verified. */
(function () {
  'use strict';
  const LINKS = {
    jkbose: [['JKBOSE syllabus (official)', 'https://jkbose.nic.in']],
    cbse: [['CBSE curriculum (official)', 'https://cbseacademic.nic.in']],
    ncert: [['NCERT textbooks', 'https://ncert.nic.in/textbook.php']]
  };
  const stage = c => c <= 2 ? 'Foundational (Classes 1–2)' : c <= 5 ? 'Preparatory (Classes 3–5)' : c <= 8 ? 'Middle (Classes 6–8)' : c <= 10 ? 'Secondary (Classes 9–10)' : 'Senior Secondary (Classes 11–12)';

  const CBSE = {
    F: ['Languages', 'Mathematics', 'Environmental Studies', 'Art Education', 'Physical Education & Wellbeing'],
    P: ['Languages', 'Mathematics', 'The World Around Us (EVS)', 'Art Education', 'Physical Education & Wellbeing', 'Computational Thinking & AI'],
    M: ['Languages (as per school)', 'Mathematics', 'Science', 'Social Science', 'Art Education', 'Physical Education & Wellbeing', 'Computational Thinking & AI'],
    S: ['Language 1', 'Language 2', 'Language 3', 'Mathematics (Standard / Advanced)', 'Science (Standard / Advanced)', 'Social Science', 'Skill / Vocational subject', 'Art Education'],
    X: ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Geography', 'Political Science', 'Psychology', 'Sociology']
  };
  const JK = {
    P: ['English', 'Urdu / Hindi / regional language (as per school)', 'Mathematics', 'Environmental Studies'],
    M: ['English', 'Hindi / Urdu', 'Mathematics', 'Science', 'Social Science', 'Regional / second language (as per school)'],
    S: ['English', 'Hindi / Urdu / other language (as per school)', 'Mathematics', 'Science', 'Social Science'],
    X: ['English', 'Hindi', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Economics', 'Education', 'Environmental Science', 'Physical Education', 'Punjabi']
  };
  const band = c => c <= 2 ? 'F' : c <= 5 ? 'P' : c <= 8 ? 'M' : c <= 10 ? 'S' : 'X';

  function notes(board, c) {
    const n = [];
    if (board === 'cbse') {
      if (c <= 9) n.push('New NCERT textbooks (written for NCF 2022/2023) are in use for this class in 2026-27. The old books are no longer prescribed.');
      if (c >= 3 && c <= 8) n.push('CBSE is phasing in a Computational Thinking & AI curriculum for Classes 3–8 from 2026-27.');
      if (c === 9 || c === 10) n.push('The 2026-27 curriculum for Classes 9–10 moves to three languages, and adds compulsory skill/vocational and arts education. Check the official circular for the language choices your school offers.');
      if (c === 9) n.push('Class 9 has a new curriculum from 2026-27, with Standard and Advanced levels for Mathematics and Science.');
      if (c === 10) n.push('Class 10 follows the new CBSE curriculum, with Standard and Advanced options in Mathematics and Science. New NCERT books for Class 10 are reported for 2027-28, so current books still apply.');
      if (c >= 11) n.push('The CBSE Curriculum 2026-27 for Classes 11–12 was released on 1 April 2026. Subject choices depend on your stream and school.');
    } else {
      n.push('JKBOSE expects schools to follow the board-prescribed textbooks and syllabus for Classes 1–12. Ask your school for your exact book list.');
      if (c === 9 || c === 10) n.push('The Class 9–10 syllabus is unchanged for 2026-27 and largely follows the NCERT textbooks, with J&K-specific content in Social Science.');
      if (c === 11) n.push('Revised for 2026-27: Punjabi and Physical Education. Other Class 11 subjects are unchanged.');
      if (c === 12) n.push('Revised for 2026-27: Education and Environmental Science. Other Class 12 subjects are unchanged.');
    }
    return n;
  }

  const CLASS10 = {
    Mathematics: ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
    Science: ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity', 'Light – Reflection and Refraction', 'The Human Eye and the Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Our Environment']
  };

  window.OrbitSyllabus = {
    info(board, c) {
      c = Number(c); const b = band(c), list = (board === 'cbse' ? CBSE : JK);
      const subjects = list[b] || list[b === 'F' ? 'P' : b];
      const links = (board === 'cbse' ? LINKS.cbse : LINKS.jkbose).concat(LINKS.ncert);
      return { stage: stage(c), subjects, notes: notes(board, c), links };
    },
    chapters(board, c, subject) {
      if (Number(c) !== 10) return null;
      const list = CLASS10[subject]; return list ? { list, note: 'Based on the NCERT Class 10 textbook. Always confirm with the latest official syllabus PDF.' } : null;
    }
  };
})();
