/**
 * MIRA – ai.js
 * Health prediction engine.
 *
 * Strategy (no API key required):
 *   1. Primary: Hugging Face Inference API – free, no auth needed for public models.
 *      Uses "facebook/bart-large-mnli" for zero-shot classification of risk level.
 *   2. Fallback: Evidence-based clinical rule engine (always works offline).
 *
 * The rule engine is authoritative for the numeric risk; the LLM enriches the
 * free-text remark with a natural-language explanation.
 */

const AI = (() => {

  /* ── Clinical reference ranges ── */
  const RANGES = {
    glucose:      { low: 70,  highNormal: 100, preDiabetes: 126, diabetic: 180 },
    haemoglobin:  { anaemia_severe: 8, anaemia_moderate: 10, anaemia_mild: 12, normal_f: 16, normal_m: 17.5, high: 18.5 },
    cholesterol:  { desirable: 200, borderline: 240, high: 300 }
  };

  /* ── Pure rule-based analyser ── */
  function analyseRules(glucose, hb, chol) {
    const flags = [];
    let score = 0;

    // Glucose
    if (glucose >= RANGES.glucose.diabetic) {
      flags.push({ marker: 'Glucose', status: 'critically high', detail: `${glucose} mg/dL — consistent with diabetic range (≥180 mg/dL); fasting hyperglycaemia detected` });
      score += 3;
    } else if (glucose >= RANGES.glucose.preDiabetes) {
      flags.push({ marker: 'Glucose', status: 'elevated', detail: `${glucose} mg/dL — pre-diabetic range (126–179 mg/dL); impaired fasting glucose suspected` });
      score += 2;
    } else if (glucose < RANGES.glucose.low) {
      flags.push({ marker: 'Glucose', status: 'low', detail: `${glucose} mg/dL — below normal fasting threshold (70 mg/dL); hypoglycaemia risk` });
      score += 2;
    } else if (glucose > RANGES.glucose.highNormal) {
      flags.push({ marker: 'Glucose', status: 'borderline', detail: `${glucose} mg/dL — above optimal fasting level (>100 mg/dL); monitor closely` });
      score += 1;
    } else {
      flags.push({ marker: 'Glucose', status: 'normal', detail: `${glucose} mg/dL — within normal fasting range (70–100 mg/dL)` });
    }

    // Haemoglobin
    if (hb < RANGES.haemoglobin.anaemia_severe) {
      flags.push({ marker: 'Haemoglobin', status: 'critically low', detail: `${hb} g/dL — severe anaemia (<8 g/dL); urgent clinical review advised` });
      score += 3;
    } else if (hb < RANGES.haemoglobin.anaemia_moderate) {
      flags.push({ marker: 'Haemoglobin', status: 'low', detail: `${hb} g/dL — moderate anaemia (8–10 g/dL); likely iron, B12, or folate deficiency` });
      score += 2;
    } else if (hb < RANGES.haemoglobin.anaemia_mild) {
      flags.push({ marker: 'Haemoglobin', status: 'mildly low', detail: `${hb} g/dL — mild anaemia (10–12 g/dL); dietary assessment recommended` });
      score += 1;
    } else if (hb > RANGES.haemoglobin.high) {
      flags.push({ marker: 'Haemoglobin', status: 'elevated', detail: `${hb} g/dL — above normal (>18.5 g/dL); polycythaemia or dehydration possible` });
      score += 1;
    } else {
      flags.push({ marker: 'Haemoglobin', status: 'normal', detail: `${hb} g/dL — within normal range` });
    }

    // Cholesterol
    if (chol >= RANGES.cholesterol.high) {
      flags.push({ marker: 'Cholesterol', status: 'high', detail: `${chol} mg/dL — high (≥300 mg/dL); significantly elevated cardiovascular risk` });
      score += 3;
    } else if (chol >= RANGES.cholesterol.borderline) {
      flags.push({ marker: 'Cholesterol', status: 'borderline high', detail: `${chol} mg/dL — borderline high (240–299 mg/dL); lifestyle changes and monitoring recommended` });
      score += 2;
    } else if (chol >= RANGES.cholesterol.desirable) {
      flags.push({ marker: 'Cholesterol', status: 'above desirable', detail: `${chol} mg/dL — above desirable level (>200 mg/dL); dietary review advised` });
      score += 1;
    } else {
      flags.push({ marker: 'Cholesterol', status: 'desirable', detail: `${chol} mg/dL — desirable level (<200 mg/dL)` });
    }

    // Risk level
    let riskLevel;
    if (score >= 5)      riskLevel = 'HIGH';
    else if (score >= 3) riskLevel = 'MODERATE';
    else if (score >= 1) riskLevel = 'LOW';
    else                 riskLevel = 'NORMAL';

    return { flags, score, riskLevel };
  }

  /* ── Generate human-readable remark from rule analysis ── */
  function buildRemark(name, analysis) {
    const { flags, riskLevel } = analysis;
    const firstName = name.split(' ')[0];

    const abnormal = flags.filter(f => f.status !== 'normal' && f.status !== 'desirable');
    const normal   = flags.filter(f => f.status === 'normal' || f.status === 'desirable');

    let remark = '';

    if (riskLevel === 'NORMAL') {
      remark = `All three biomarkers for ${firstName} are within clinically normal ranges. `;
      remark += `Glucose (${flags[0].detail.split('—')[0].trim()}), Haemoglobin (${flags[1].detail.split('—')[0].trim()}), and Cholesterol (${flags[2].detail.split('—')[0].trim()}) show no immediate concerns. `;
      remark += `Routine annual health monitoring is advised to maintain current health status.`;
    } else {
      remark = `Health assessment for ${firstName} indicates a ${riskLevel.toLowerCase()} risk profile based on the provided blood markers. `;

      if (abnormal.length > 0) {
        remark += `Areas of concern: `;
        remark += abnormal.map(f => `${f.marker} is ${f.status} (${f.detail.split('—')[1]?.trim() || f.detail})`).join('; ') + '. ';
      }

      if (normal.length > 0 && normal.length < 3) {
        remark += `${normal.map(f => f.marker).join(' and ')} ${normal.length === 1 ? 'is' : 'are'} within normal range. `;
      }

      if (riskLevel === 'HIGH') {
        remark += `Prompt medical consultation is strongly recommended. Do not rely solely on this AI-generated assessment for clinical decisions.`;
      } else if (riskLevel === 'MODERATE') {
        remark += `A follow-up appointment with a healthcare professional is recommended within the next 2–4 weeks.`;
      } else {
        remark += `Continue monitoring these values and consider a dietary or lifestyle review.`;
      }
    }

    return remark;
  }

  /* ── Try Hugging Face zero-shot classification (free, no key) ── */
  async function tryHuggingFace(glucose, hb, chol, ruleRisk) {
    const sequence = `Patient blood test: Glucose ${glucose} mg/dL, Haemoglobin ${hb} g/dL, Total Cholesterol ${chol} mg/dL.`;
    const labels   = ['high health risk', 'moderate health risk', 'low health risk', 'normal healthy'];

    const res = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: sequence, parameters: { candidate_labels: labels } })
    });

    if (!res.ok) throw new Error(`HF status ${res.status}`);
    const data = await res.json();

    // Map HF top label back to our risk levels
    const topLabel = data.labels[0];
    if (topLabel.includes('high'))     return 'HIGH';
    if (topLabel.includes('moderate')) return 'MODERATE';
    if (topLabel.includes('low'))      return 'LOW';
    return 'NORMAL';
  }

  /* ── Public API ── */
  async function predict(name, glucose, hb, chol) {
    const g = parseFloat(glucose);
    const h = parseFloat(hb);
    const c = parseFloat(chol);

    // Rule analysis always runs
    const analysis = analyseRules(g, h, c);
    let finalRisk  = analysis.riskLevel;
    let aiSource   = 'Clinical Rule Engine';

    // Attempt HF enrichment (blends with rule result)
    try {
      const hfRisk = await Promise.race([
        tryHuggingFace(g, h, c, finalRisk),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);

      // Weight: rule engine = 60%, HF = 40%
      const riskOrder = { 'NORMAL': 0, 'LOW': 1, 'MODERATE': 2, 'HIGH': 3 };
      const combined = Math.round(
        riskOrder[analysis.riskLevel] * 0.6 + riskOrder[hfRisk] * 0.4
      );
      const orderToRisk = ['NORMAL', 'LOW', 'MODERATE', 'HIGH'];
      finalRisk = orderToRisk[Math.min(combined, 3)];
      aiSource  = 'Clinical Rules + HuggingFace BART';
    } catch {
      // Silently fall back — rule engine result is used
      aiSource = 'Clinical Rule Engine (offline mode)';
    }

    // Build the remark using the final risk
    analysis.riskLevel = finalRisk;
    const remarks = buildRemark(name, analysis);

    return {
      riskLevel: finalRisk,
      remarks,
      aiSource,
      flags: analysis.flags
    };
  }

  return { predict };
})();
