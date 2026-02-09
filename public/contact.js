// public/contact.js

const STORAGE_KEY = 'league_contact_autosave';
const STORAGE_TIMESTAMP_KEY = 'league_contact_timestamp';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-request-form');
  if (!form) {
    return;
  }

  const requestTypeSelect = document.getElementById('contact-request-type');
  const feedbackElement = document.getElementById('contact-feedback');
  const requestGroups = Array.from(document.querySelectorAll('[data-request-group]'));
  const infoPanels = Array.from(document.querySelectorAll('[data-request-info]'));
  const submitButton = form.querySelector('button[type="submit"]');

  // Autosave functionality
  const saveFormState = () => {
    const formData = new FormData(form);
    const state = {};
    formData.forEach((value, key) => {
      state[key] = value;
    });
    state.requestType = requestTypeSelect?.value || 'medal';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  };

  const loadFormState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      if (!saved || !timestamp) {
        return false;
      }

      const state = JSON.parse(saved);
      Object.keys(state).forEach(key => {
        const field = form.elements[key];
        if (field) {
          field.value = state[key];
        }
      });

      // Show restore notification if form was partially filled
      const timeAgo = Math.round((Date.now() - parseInt(timestamp)) / 60000);
      const timeLabel = timeAgo < 60 ? `${timeAgo}m` : `${Math.round(timeAgo / 60)}h`;
      setFeedback(`Form restored from ${timeLabel} ago`, 'info');
      return true;
    } catch (e) {
      return false;
    }
  };

  const clearFormState = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
  };

  const setFeedback = (message, status = '') => {
    if (!feedbackElement) {
      return;
    }
    feedbackElement.textContent = message || '';
    if (status) {
      feedbackElement.dataset.status = status;
    } else {
      feedbackElement.removeAttribute('data-status');
    }
  };

  const toggleRequestGroups = () => {
    const selectedType = requestTypeSelect?.value || 'medal';
    requestGroups.forEach(group => {
      const groupType = group.getAttribute('data-request-group');
      const isActive = groupType === selectedType;
      group.hidden = !isActive;
      group.querySelectorAll('input, textarea, select').forEach(field => {
        if (field) {
          field.toggleAttribute('required', isActive && field.dataset.required === 'true');
        }
      });
    });

    infoPanels.forEach(panel => {
      const panelType = panel.getAttribute('data-request-info');
      panel.hidden = panelType !== selectedType;
    });
  };

  // Initialize autosave
  loadFormState();
  toggleRequestGroups();

  // Attach autosave listeners to all form fields
  form.querySelectorAll('input, textarea, select').forEach(field => {
    field.addEventListener('input', saveFormState);
    field.addEventListener('change', saveFormState);
  });

  if (requestTypeSelect) {
    requestTypeSelect.addEventListener('change', () => {
      toggleRequestGroups();
      saveFormState();
    });
  }

  const buildPayload = () => {
    const formData = new FormData(form);
    const athleteIdentifier = (formData.get('athleteIdentifier') || '').toString().trim();
    const payload = {
      name: (formData.get('name') || '').toString().trim(),
      email: (formData.get('email') || '').toString().trim(),
      requestType: requestTypeSelect?.value || 'medal',
      athleteId: athleteIdentifier,
      stravaProfile: athleteIdentifier,
      notes: (formData.get('notes') || '').toString().trim(),
    };

    if (payload.requestType === 'medal') {
      payload.medalDescription = (formData.get('medalDescription') || '').toString().trim();
    } else if (payload.requestType === 'race') {
      payload.raceDate = formData.get('raceDate');
      payload.raceStartLocation = (formData.get('raceLocation') || '').toString().trim();
      payload.raceType = formData.get('raceType');
      payload.raceDistanceKm = formData.get('raceDistance');
      payload.raceElevationGain = formData.get('raceElevation');
    } else if (payload.requestType === 'climb') {
      payload.segmentId = (formData.get('segmentId') || '').toString().trim();
    }

    return payload;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!submitButton) {
      return;
    }

    setFeedback('');
    submitButton.disabled = true;
    submitButton.dataset.loading = 'true';

    try {
      const payload = buildPayload();
      const response = await fetch('/api/contact/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to submit your request right now.');
      }
      setFeedback(data?.message || 'Request submitted.', 'success');
      form.reset();
      clearFormState();
      toggleRequestGroups();
    } catch (error) {
      setFeedback(error.message || 'Unable to submit your request.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.dataset.loading = 'false';
    }
  });
});
