(() => {
  'use strict';
  const form = document.getElementById('assessment-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.sa-step'));
  const stepLabel = document.getElementById('step-label');
  const progressPercent = document.getElementById('progress-percent');
  const progressTrack = document.getElementById('progress-track');
  const progressFill = document.getElementById('progress-fill');
  const results = document.getElementById('assessment-results');
  const resultsIntro = document.getElementById('results-intro');
  const resultsList = document.getElementById('results-list');
  const sectorNote = document.getElementById('sector-note');
  const priorityError = document.getElementById('priority-error');
  const emailStatus = document.getElementById('email-status');
  const contactForm = document.getElementById('contact-details');
  const contextInput = document.getElementById('contact-context');
  let activeStep = 0;
  let lastSummary = '';

  const labels = {
    'app-test': 'Website and application security testing',
    infrastructure: 'Network, cloud and infrastructure hardening',
    monitoring: 'Threat monitoring and detection coverage',
    incident: 'Incident readiness and response planning',
    privacy: 'Privacy and compliance readiness',
    awareness: 'Staff awareness and practical training',
    baseline: 'Baseline security review and asset visibility'
  };
  const advice = {
    'app-test': 'Confirm the in-scope websites, APIs and applications; agree written authorisation, test boundaries, evidence handling and a remediation retest before any testing begins.',
    infrastructure: 'Create an agreed inventory of critical systems and cloud/network assets, review identity and access controls, and prioritise exposed services and configuration gaps.',
    monitoring: 'Map the systems and identity sources that are logged today, who reviews alerts, escalation ownership, retention and out-of-hours coverage.',
    incident: 'Document incident roles, internal escalation, backup and recovery expectations, evidence preservation and a tabletop exercise. If an incident may be active, use an agreed secure channel for technical evidence.',
    privacy: 'Map data flows and owners, review current safeguards and retention practices, and identify the policies, records and evidence the organisation needs to assess against applicable obligations.',
    awareness: 'Set a practical training plan for phishing recognition, reporting suspicious messages, handling sensitive information and measuring learning without shaming individuals.',
    baseline: 'Start with critical assets, business impact, privileged access, backup/recovery, patching and ownership. Use the findings to sequence a proportionate improvement plan.'
  };
  const sectorAdvice = {
    healthcare: 'For healthcare environments, include clinical availability, access to patient systems, backup/recovery and a carefully controlled incident escalation process in the discussion.',
    education: 'For schools and colleges, consider shared devices, identity protection, student/staff awareness, safeguarding of personal information and continuity of learning services.',
    government: 'For public-sector environments, clarify ownership, approved procedures, audit trails, procurement constraints and formal written authorisation before technical work.',
    political: 'For campaign or political organisations, consider account takeover, phishing, public-facing web assets, rapid access revocation and continuity during time-sensitive activity.',
    'small-business': 'For smaller teams, prioritise a maintainable baseline and clear ownership before adding complex tools the organisation cannot operate consistently.',
    enterprise: 'For larger environments, define system ownership, business-critical dependencies, reporting audiences and how remediation will be tracked across teams.',
    nonprofit: 'For non-profits and other institutions, align security tasks with the sensitivity of held information, service continuity and the capacity available to maintain controls.'
  };

  function currentValues() {
    const data = new FormData(form);
    return {
      sector: data.get('sector') || '',
      size: data.get('size') || '',
      priorities: data.getAll('priorities'),
      readiness: data.get('readiness') || '',
      timeline: data.get('timeline') || ''
    };
  }

  function updateProgress(index) {
    const percent = Math.round(((index + 1) / steps.length) * 100);
    stepLabel.textContent = 'STEP ' + (index + 1) + ' OF ' + steps.length;
    progressPercent.textContent = percent + '% complete';
    progressFill.style.width = percent + '%';
    progressTrack.setAttribute('aria-valuenow', String(percent));
  }

  function showStep(index) {
    activeStep = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((step, i) => { step.hidden = i !== activeStep; });
    results.hidden = true;
    form.hidden = false;
    updateProgress(activeStep);
    const legend = steps[activeStep].querySelector('legend');
    if (legend) legend.setAttribute('tabindex', '-1'), legend.focus();
    document.getElementById('assessment-title').textContent = activeStep === 0 ? "Let's establish the context." : activeStep === 1 ? 'What would you like to focus on?' : 'How ready are you to act?';
  }

  function clearErrors(scope) {
    scope.querySelectorAll('[data-error-for]').forEach((node) => { node.textContent = ''; });
    scope.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
  }

  function validateStep(index) {
    const section = steps[index];
    clearErrors(section);
    let firstInvalid = null;
    const controls = Array.from(section.querySelectorAll('select,input,textarea')).filter((el) => el.required);
    controls.forEach((el) => {
      const valid = el.checkValidity();
      if (!valid) {
        el.setAttribute('aria-invalid', 'true');
        const error = section.querySelector('[data-error-for="' + el.id + '"]');
        if (error) error.textContent = 'Please select an option to continue.';
        if (!firstInvalid) firstInvalid = el;
      }
    });
    if (index === 1) {
      const count = section.querySelectorAll('input[name="priorities"]:checked').length;
      priorityError.textContent = count ? '' : 'Select at least one priority so the guide can be tailored to you.';
      if (!count && !firstInvalid) firstInvalid = section.querySelector('input[name="priorities"]');
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function addRecommendation(number, title, detail) {
    const item = document.createElement('article');
    item.className = 'sa-result-item';
    const index = document.createElement('span');
    index.className = 'sa-result-num';
    index.textContent = String(number).padStart(2, '0');
    const content = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    content.append(heading, paragraph);
    item.append(index, content);
    resultsList.append(item);
  }

  function buildSummary(values) {
    const selectedLabels = values.priorities.map((key) => labels[key] || key);
    const sectorSelect = document.getElementById('sector');
    const sectorLabel = sectorSelect.options[sectorSelect.selectedIndex].text;
    const lines = [
      'SECURITY NEEDS DISCUSSION GUIDE — SHIELD INFOSEC',
      '',
      'Organisation sector: ' + sectorLabel,
      'Approximate team size: ' + values.size,
      'Current security setup: ' + values.readiness,
      'Preferred timing: ' + values.timeline,
      'Areas selected: ' + selectedLabels.join('; '),
      '',
      'Suggested discussion checklist:'
    ];
    values.priorities.forEach((key, index) => lines.push((index + 1) + '. ' + labels[key] + ' — ' + advice[key]));
    if (sectorAdvice[values.sector]) lines.push('', 'Sector-specific discussion: ' + sectorAdvice[values.sector]);
    const name = document.getElementById('contact-name').value.trim();
    const organisation = document.getElementById('contact-org').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const context = contextInput.value.trim();
    if (name || organisation || email || phone) {
      lines.push('', 'CONTACT DETAILS (provided voluntarily):');
      if (name) lines.push('Name: ' + name);
      if (organisation) lines.push('Organisation: ' + organisation);
      if (email) lines.push('Work email: ' + email);
      if (phone) lines.push('Phone: ' + phone);
    }
    if (context) lines.push('', 'Additional high-level context: ' + context);
    lines.push('', 'Note: This guide reflects self-selected answers only. It is not a security audit, penetration test, risk rating or compliance determination.');
    return lines.join('\n');
  }

  function renderResults(values) {
    resultsList.replaceChildren();
    const sectorSelect = document.getElementById('sector');
    const sectorLabel = sectorSelect.options[sectorSelect.selectedIndex].text;
    resultsIntro.textContent = 'Based on the selections for ' + sectorLabel + ' (' + values.size + '), use these topics to frame a first discussion. The suggested order is based on your chosen priorities, not a verified assessment of your systems.';
    values.priorities.forEach((key, index) => addRecommendation(index + 1, labels[key] || key, advice[key] || 'Confirm scope, ownership and intended outcomes with a qualified security professional.'));
    const maturity = values.readiness === 'No formal programme yet'
      ? 'A baseline review and a prioritised inventory may be a useful first conversation.'
      : values.readiness === 'Basic controls are in place'
      ? 'Discuss whether the existing controls cover critical assets and how their effectiveness is validated.'
      : values.readiness === 'Several tools and policies are in place'
      ? 'Consider how consistently current controls work together, who owns exceptions and how remediation is verified.'
      : values.readiness === 'Established team and documented processes'
      ? 'Consider independent validation, incident exercises and evidence that controls remain effective as systems change.'
      : 'A guided current-state review can help clarify which safeguards exist, who owns them and what should be validated.';
    addRecommendation(values.priorities.length + 1, 'Align the work to your current readiness', maturity + ' Preferred timing: ' + values.timeline + '.');
    if (sectorAdvice[values.sector]) {
      sectorNote.hidden = false;
      sectorNote.textContent = sectorAdvice[values.sector];
    } else {
      sectorNote.hidden = true;
      sectorNote.textContent = '';
    }
    lastSummary = buildSummary(values);
    form.hidden = true;
    results.hidden = false;
    stepLabel.textContent = 'GUIDE READY';
    progressPercent.textContent = '100% complete';
    progressFill.style.width = '100%';
    progressTrack.setAttribute('aria-valuenow', '100');
    document.getElementById('assessment-title').textContent = 'Your guide is ready.';
    document.getElementById('results-heading').focus();
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  form.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    if (validateStep(activeStep)) showStep(activeStep + 1);
  }));
  form.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(activeStep - 1)));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateStep(activeStep)) return;
    if (activeStep < steps.length - 1) {
      showStep(activeStep + 1);
      return;
    }
    renderResults(currentValues());
  });

  document.getElementById('edit-answers').addEventListener('click', () => {
    showStep(0);
    document.getElementById('assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  contextInput.addEventListener('input', () => {
    document.getElementById('context-count').textContent = String(contextInput.value.length);
  });

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailField = document.getElementById('contact-email');
    emailStatus.textContent = '';
    if (emailField.value.trim() && !emailField.checkValidity()) {
      emailField.setAttribute('aria-invalid', 'true');
      emailStatus.textContent = 'Please check the work email format, or leave that optional field blank.';
      emailField.focus();
      return;
    }
    emailField.removeAttribute('aria-invalid');
    lastSummary = buildSummary(currentValues());
    const subject = encodeURIComponent('Security needs discussion — Shield InfoSec');
    const body = encodeURIComponent(lastSummary);
    window.location.href = 'mailto:info@shieldsecurity.co.in?subject=' + subject + '&body=' + body;
    emailStatus.textContent = 'Your email application should open with a prepared draft. Review it before sending; this website has not submitted your answers.';
  });

  document.getElementById('copy-summary').addEventListener('click', async () => {
    lastSummary = buildSummary(currentValues());
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(lastSummary);
      } else {
        const temporary = document.createElement('textarea');
        temporary.value = lastSummary;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.append(temporary);
        temporary.select();
        const copied = document.execCommand('copy');
        temporary.remove();
        if (!copied) throw new Error('Copy command unavailable');
      }
      emailStatus.textContent = 'Summary copied. You can paste it into an email to info@shieldsecurity.co.in. No submission was made.';
    } catch (error) {
      emailStatus.textContent = 'Automatic copying was blocked by the browser. Select and copy the summary using the email draft, or email info@shieldsecurity.co.in.';
      const textarea = document.createElement('textarea');
      textarea.value = lastSummary;
      textarea.readOnly = true;
      textarea.setAttribute('aria-label', 'Selectable enquiry summary');
      textarea.className = 'sa-copy-textarea';
      const existing = document.querySelector('.sa-copy-textarea');
      if (existing) existing.remove();
      document.querySelector('.sa-contact-form').append(textarea);
      textarea.focus();
      textarea.select();
    }
  });

  document.getElementById('start-over').addEventListener('click', () => {
    form.reset();
    document.getElementById('contact-name').value = '';
    document.getElementById('contact-org').value = '';
    document.getElementById('contact-email').value = '';
    document.getElementById('contact-phone').value = '';
    contextInput.value = '';
    document.getElementById('context-count').textContent = '0';
    const copiedText = document.querySelector('.sa-copy-textarea');
    if (copiedText) copiedText.remove();
    priorityError.textContent = '';
    showStep(0);
    document.getElementById('assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  showStep(0);
})();
