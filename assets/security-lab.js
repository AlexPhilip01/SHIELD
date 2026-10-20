(() => {
  'use strict';
  const scenarioSelect = document.getElementById('scenario');
  const stageButtons = Array.from(document.querySelectorAll('[data-stage]'));
  const responseTitle = document.getElementById('response-title');
  const responseDescription = document.getElementById('response-description');
  const responseCheckpoint = document.getElementById('response-checkpoint');
  const responseKicker = document.getElementById('response-kicker');
  const responseIndex = document.getElementById('response-index');
  const simStatus = document.getElementById('sim-status');
  const simStepLabel = document.getElementById('sim-step-label');
  const previousButton = document.getElementById('previous-stage');
  const nextButton = document.getElementById('next-stage');
  const environment = document.getElementById('environment');
  const layerToggles = Array.from(document.querySelectorAll('.sl-layer-toggle'));
  const layerNodes = Array.from(document.querySelectorAll('.sl-arch-node'));
  const environmentDescription = document.getElementById('environment-description');
  const architectureProfile = document.getElementById('architecture-profile');
  const coverageCount = document.getElementById('coverage-count');
  const coverageCopy = document.getElementById('coverage-copy');
  const priorityText = document.getElementById('priority-text');

  const workflows = {
    phishing: {
      status: ['Alert received', 'Context reviewed', 'Containment planned', 'Access restored', 'Improvements logged'],
      stages: [
        ['Validate the initial signal.', 'Correlate the suspicious sign-in with the reported message, identity context and available logs. Preserve timestamps and the source of the alert.', 'What evidence confirms the activity, and who is authorised to lead the response?'],
        ['Establish whether the activity is malicious.', 'Compare the account, device, sign-in location, MFA events, mailbox rules and user report. Separate confirmed facts from assumptions.', 'What evidence is needed before choosing a containment action?'],
        ['Limit further account misuse.', 'Under the approved runbook, revoke active sessions, secure the account, review forwarding rules and block confirmed malicious indicators where appropriate.', 'Who can approve actions that could interrupt a user or business service?'],
        ['Restore trusted access.', 'Re-verify the account owner, restore required access, validate MFA and monitor for repeat sign-ins or unauthorised mailbox changes.', 'What checks show access is safe to restore, and what monitoring follows?'],
        ['Capture lessons and close the loop.', 'Record the timeline, control gaps, user reporting path and follow-up owners. Use the incident to update controls and awareness content.', 'Which corrective action has an owner and a date for verification?']
      ]
    },
    cloud: {
      status: ['Exposure suspected', 'Scope verified', 'Access restricted', 'Configuration validated', 'Guardrails improved'],
      stages: [
        ['Confirm the suspected exposure.', 'Identify the reported cloud resource and inspect the relevant configuration and access logs using an authorised account. Do not assume public reachability from a single alert.', 'What resource is in scope, and what evidence establishes its current access settings?'],
        ['Establish data and access impact.', 'Check exposure window, resource permissions, data classification, access logs and any related credentials or integrations.', 'What data may be involved, and which system owners need to be notified?'],
        ['Restrict unintended access safely.', 'Apply the approved change to remove unintended public access, preserve evidence and validate that intended services still function.', 'Who approves the change, and how is service impact checked?'],
        ['Validate the secure configuration.', 'Review related identities, keys, logs and dependent services. Rotate credentials if exposure is plausible and the response plan calls for it.', 'How will the team verify that the original exposure path is closed?'],
        ['Prevent recurrence.', 'Add configuration guardrails, ownership checks, alerting and periodic reviews. Track remediation to a verified completion state.', 'How will drift be detected before the same condition returns?']
      ]
    },
    ransomware: {
      status: ['Endpoint signal raised', 'Impact assessed', 'Spread limited', 'Recovery verified', 'Lessons documented'],
      stages: [
        ['Validate the endpoint alert.', 'Review the detection, affected asset identity, time sequence and supporting telemetry. Preserve evidence and involve the designated incident lead.', 'What confirms a genuine threat rather than a false positive?'],
        ['Assess likely scope and impact.', 'Check the affected user, device, adjacent systems, privilege level and signs of lateral movement. Avoid wiping or reimaging before evidence needs are considered.', 'Which assets and business services may be affected?'],
        ['Limit spread using the approved plan.', 'Coordinate any network isolation or access restrictions with the incident lead and service owners. Preserve logs and follow the evidence-handling procedure.', 'What containment action is authorised and proportionate to the impact?'],
        ['Restore from a verified clean state.', 'Use known-good backups and a controlled restore process. Validate system integrity, credentials, business data and monitoring before reconnecting systems.', 'Has restoration been tested, and who authorises reconnecting the asset?'],
        ['Strengthen resilience after recovery.', 'Document the timeline and root causes, test recovery assumptions, close control gaps and assign owners to agreed remediation actions.', 'Which recovery or prevention control needs to be tested next?']
      ]
    }
  };
  const stageNames = ['Detect', 'Triage', 'Contain', 'Recover', 'Learn'];
  let currentStage = 0;

  function renderWorkflow() {
    const workflow = workflows[scenarioSelect.value] || workflows.phishing;
    const stage = workflow.stages[currentStage];
    stageButtons.forEach((button, index) => {
      button.classList.toggle('is-active', index === currentStage);
      button.classList.toggle('is-complete', index < currentStage);
      button.setAttribute('aria-pressed', String(index === currentStage));
      button.querySelector('.sl-stage-state').textContent = index === currentStage ? 'NOW' : index < currentStage ? 'DONE' : (index === currentStage + 1 ? 'NEXT' : 'PENDING');
    });
    responseKicker.textContent = stageNames[currentStage].toUpperCase() + ' / EXAMPLE ' + String(currentStage + 1).padStart(2, '0');
    responseIndex.textContent = String(currentStage + 1).padStart(2, '0');
    responseTitle.textContent = stage[0];
    responseDescription.textContent = stage[1];
    responseCheckpoint.textContent = stage[2];
    simStatus.textContent = workflow.status[currentStage];
    simStepLabel.textContent = (currentStage + 1) + ' of ' + stageNames.length;
    previousButton.disabled = currentStage === 0;
    nextButton.disabled = currentStage === stageNames.length - 1;
    nextButton.setAttribute('aria-label', currentStage === stageNames.length - 1 ? 'End of example workflow' : 'Next stage');
    document.getElementById('response-state').lastChild.textContent = ' DEMONSTRATION';
  }
  stageButtons.forEach((button) => button.addEventListener('click', () => {
    currentStage = Number(button.dataset.stage);
    renderWorkflow();
  }));
  previousButton.addEventListener('click', () => {
    currentStage = Math.max(0, currentStage - 1);
    renderWorkflow();
  });
  nextButton.addEventListener('click', () => {
    currentStage = Math.min(stageNames.length - 1, currentStage + 1);
    renderWorkflow();
  });
  scenarioSelect.addEventListener('change', () => {
    currentStage = 0;
    renderWorkflow();
  });

  const layers = {
    identity: {label:'Identity & MFA', short:'Identity', desc:'Strong authentication, least privilege and managed privileged access.'},
    endpoint: {label:'Endpoint protection', short:'Endpoints', desc:'Managed devices, hardening, endpoint detection and response coverage.'},
    network: {label:'Network & cloud', short:'Network / cloud', desc:'Cloud configuration, external exposure and segmentation controls.'},
    email: {label:'Email security', short:'Email', desc:'Anti-phishing controls, sender authentication and user reporting.'},
    application: {label:'Application security', short:'Applications', desc:'Secure development, application testing and secrets management.'},
    data: {label:'Data protection', short:'Data', desc:'Data classification, minimisation, encryption and privacy practices.'},
    monitoring: {label:'Detection & response', short:'Monitoring', desc:'Useful logs, alert triage, response ownership and escalation paths.'},
    recovery: {label:'Backup & recovery', short:'Recovery', desc:'Protected backups, restore testing and continuity planning.'}
  };
  const profiles = {
    small: {
      title:'SMB / Core protections',
      description:'A maintainable baseline focused on identity, endpoint controls, perimeter exposure and recoverability.',
      default:['identity','endpoint','network','email','recovery'],
      priority:'Start with identity hardening and MFA, managed endpoints, exposed services, email protections and a tested recovery path.'
    },
    healthcare: {
      title:'Healthcare / Service continuity',
      description:'Keep critical services available while protecting sensitive information and access to clinical systems.',
      default:['identity','endpoint','network','data','monitoring','recovery'],
      priority:'Start with access to clinical systems, managed endpoints, sensitive-data safeguards, monitoring ownership and tested downtime/recovery procedures.'
    },
    education: {
      title:'Education / Shared environments',
      description:'Balance shared devices and broad user populations with identity, privacy, email safety and recoverability.',
      default:['identity','endpoint','email','data','monitoring','recovery'],
      priority:'Start with account protection, shared-device controls, phishing reporting, student/staff data handling and recovery for learning services.'
    },
    enterprise: {
      title:'Enterprise / Connected controls',
      description:'Connect identity, endpoint, infrastructure, application, data and monitoring owners across a larger estate.',
      default:['identity','endpoint','network','email','application','data','monitoring','recovery'],
      priority:'Start by mapping critical assets and ownership, then validate identity, application and cloud controls, detection coverage and recovery evidence across teams.'
    }
  };
  let selectedLayers = new Set(profiles.small.default);

  function applyProfile(profileKey) {
    const profile = profiles[profileKey] || profiles.small;
    environmentDescription.textContent = profile.description;
    architectureProfile.textContent = profile.title;
    selectedLayers = new Set(profile.default);
    renderLayers();
  }
  function renderLayers() {
    layerToggles.forEach((button) => {
      const selected = selectedLayers.has(button.dataset.layer);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    layerNodes.forEach((button) => {
      const selected = selectedLayers.has(button.dataset.layer);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      const info = layers[button.dataset.layer];
      button.title = (selected ? 'Selected: ' : 'Not selected: ') + info.label + '. Activate to toggle.';
      button.querySelector('small').textContent = selected ? 'Included in model' : 'Not selected';
    });
    const count = selectedLayers.size;
    coverageCount.textContent = count + ' of 8 layers selected';
    coverageCopy.textContent = count === 0
      ? 'No layers selected. Choose a layer to include it in the discussion model.'
      : 'Selected layers are discussion areas to validate, assign owners to and test regularly.';
    const key = environment.value;
    const profile = profiles[key] || profiles.small;
    const primary = profile.default.filter((layer) => selectedLayers.has(layer));
    const missing = profile.default.filter((layer) => !selectedLayers.has(layer));
    if (primary.length === 0) {
      priorityText.textContent = 'Choose one or more layers, then validate how they connect to your organisation’s actual risks and operational needs.';
    } else {
      const names = primary.slice(0, 3).map((layer) => layers[layer].short);
      priorityText.textContent = profile.priority + (missing.length ? ' The current model has not selected: ' + missing.map((layer) => layers[layer].short).join(', ') + '.' : '');
      if (primary.length < profile.default.length) {
        priorityText.textContent += ' Current selected focus: ' + names.join(', ') + (primary.length > 3 ? ' and ' + (primary.length - 3) + ' more' : '') + '.';
      }
    }
    document.getElementById('architecture-scene').setAttribute('aria-label', profile.title + '. ' + count + ' of 8 layers selected. Diagram is illustrative.');
  }
  function toggleLayer(key) {
    if (!layers[key]) return;
    if (selectedLayers.has(key)) selectedLayers.delete(key);
    else selectedLayers.add(key);
    renderLayers();
  }
  layerToggles.forEach((button) => button.addEventListener('click', () => toggleLayer(button.dataset.layer)));
  layerNodes.forEach((button) => button.addEventListener('click', () => toggleLayer(button.dataset.layer)));
  environment.addEventListener('change', () => applyProfile(environment.value));
  document.getElementById('select-recommended').addEventListener('click', () => {
    selectedLayers = new Set((profiles[environment.value] || profiles.small).default);
    renderLayers();
  });
  document.getElementById('reset-layers').addEventListener('click', () => applyProfile(environment.value));

  renderWorkflow();
  applyProfile(environment.value);
})();