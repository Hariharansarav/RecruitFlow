import emailjs from '@emailjs/browser';

export const emailService = {
  /**
   * Send interview invitation email to the assigned Tech Lead via EmailJS
   *
   * @param {Object} params
   * @param {string} params.techLeadName
   * @param {string} params.techLeadEmail
   * @param {string} params.candidateName
   * @param {string} params.jobTitle
   * @param {string} params.evaluationLink
   * @param {string|Date} params.expiresAt
   * @returns {Promise<{success: boolean, simulated?: boolean, response?: any}>}
   */
  async sendTechLeadInvitationEmail({
    techLeadName,
    techLeadEmail,
    candidateName,
    jobTitle,
    evaluationLink,
    expiresAt,
  }) {
    // Dynamically retrieve environment variables on every call
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    const formattedExpiresAt = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })
      : 'Within 7 days';

    // Formatted fallback message body in case the EmailJS template uses {{message}}
    const messageBody = `Hello ${techLeadName},

You have been assigned to conduct the technical interview evaluation for candidate ${candidateName} for the position of ${jobTitle}.

Please access the secure evaluation report using the link below:
${evaluationLink}

Evaluation Guidelines:
1. Review the candidate's profile and technical competencies extracted from the Job Description.
2. Provide a score from 0 to 5 for each required skill.
3. Add qualitative notes and interview observations.
4. Submit your evaluation to finalize your report.

This link is valid until: ${formattedExpiresAt}.

Best regards,
RecruitFlow Hiring Team`;

    // Comprehensive parameter map covering all common template variable conventions
    const templateParams = {
      // Tech Lead / Recipient parameters
      to_name: techLeadName,
      tech_lead_name: techLeadName,
      name: techLeadName,
      to_email: techLeadEmail,
      tech_lead_email: techLeadEmail,
      email: techLeadEmail,
      recipient_email: techLeadEmail,

      // Candidate parameters
      candidate_name: candidateName,
      candidate: candidateName,

      // Job / Position parameters
      job_title: jobTitle,
      role: jobTitle,
      position: jobTitle,

      // Secure Evaluation Link parameters
      evaluation_link: evaluationLink,
      evaluation_url: evaluationLink,
      link: evaluationLink,
      url: evaluationLink,
      report_link: evaluationLink,
      report_url: evaluationLink,

      // Instructions and content
      message: messageBody,
      instructions:
        'Please evaluate the candidate across all required technical competencies defined for this role. Rate each competency on a 0-5 scale and provide qualitative notes.',
      expires_at: formattedExpiresAt,
      deadline: formattedExpiresAt,
      deadline_notice: `Valid for 7 days (expires ${formattedExpiresAt})`,

      // Email header / metadata parameters
      from_name: 'RecruitFlow Hiring Team',
      reply_to: 'no-reply@recruitflow.com',
      subject: `Technical Interview Evaluation: ${candidateName} (${jobTitle})`,
    };

    // Diagnostic logging for browser console inspection
    console.group('📧 [EmailJS] Dispatching Tech Lead Interview Invitation');
    console.log('Service ID:', serviceId);
    console.log('Template ID:', templateId);
    console.log('Public Key:', publicKey ? `${publicKey.slice(0, 5)}...` : 'missing');
    console.log('Recipient (Tech Lead):', `${techLeadName} <${techLeadEmail}>`);
    console.log('Candidate:', candidateName);
    console.log('Job Title:', jobTitle);
    console.log('Secure Evaluation Link:', evaluationLink);
    console.log('Template Parameters:', templateParams);
    console.groupEnd();

    // Check if real keys are configured
    const isMockKey =
      !publicKey ||
      publicKey.includes('recruitflow_emailjs_key') ||
      publicKey.includes('your_emailjs') ||
      !serviceId ||
      serviceId.includes('service_recruitflow') ||
      serviceId.includes('your_emailjs');

    if (isMockKey) {
      console.warn(
        '⚠️ [EmailJS] Simulated Email Delivery: Placeholder or demo keys detected in environment variables. ' +
        'Please configure real EmailJS credentials in .env.local.'
      );
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        simulated: true,
        status: 200,
        text: 'OK (Simulated Delivery)',
        templateParams,
      };
    }

    try {
      // Initialize or send via EmailJS browser SDK
      const response = await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        publicKey
      );
      console.log('✅ [EmailJS] Email dispatched successfully to Tech Lead:', response.status, response.text);
      return {
        success: true,
        simulated: false,
        status: response.status,
        text: response.text,
        templateParams,
      };
    } catch (error) {
      console.error('❌ [EmailJS] Failed to dispatch email to Tech Lead:', error);
      throw new Error(
        error?.text || error?.message || 'Failed to dispatch email via EmailJS'
      );
    }
  },
};

export default emailService;
