// public/contact.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-request-form');
  if (!form) {
    return;
  }

  const requestTypeSelect = document.getElementById('contact-request-type');
  const feedbackElement = document.getElementById('contact-feedback');
  const requestGroups = Array.from(document.querySelectorAll('[data-request-group]'));
  const submitButton = form.querySelector('button[type="submit"]');

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
      group.hidden = groupType !== selectedType;
      group.querySelectorAll('input, textarea').forEach(field => {
        if (field) {
          field.toggleAttribute('required', groupType === selectedType && field.dataset.required === 'true');
        }
      });
    });
  };

  toggleRequestGroups();
  if (requestTypeSelect) {
    requestTypeSelect.addEventListener('change', toggleRequestGroups);
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
      const requestId = data?.request?.requestUid;
      setFeedback(requestId ? `${data.message} (ID: ${requestId})` : (data.message || 'Request submitted.'), 'success');
      form.reset();
      toggleRequestGroups();
    } catch (error) {
      setFeedback(error.message || 'Unable to submit your request.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.dataset.loading = 'false';
    }
  });
});
