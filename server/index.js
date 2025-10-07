const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(bodyParser.json());

// Helper to verify user via JWT (optional) - uses Supabase admin endpoint to get user by token
async function verifyUser(accessToken) {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) return { error };
    return { user: data.user };
  } catch (err) {
    return { error: err };
  }
}

app.post('/submit', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  const { participantId, questionId, submittedCode, points } = req.body || {};
  if (!participantId || typeof points !== 'number') {
    return res.status(400).json({ error: 'participantId and points are required' });
  }

  // Verify the token (optional, but recommended)
  const { user, error: verifyErr } = await verifyUser(token);
  if (verifyErr || !user) {
    return res.status(401).json({ error: verifyErr?.message || 'Invalid token' });
  }

  try {
    // Call RPC submit_and_increment if exists
    try {
      const { data, error } = await supabase.rpc('submit_and_increment', {
        p_participant_id: participantId,
        p_question_id: questionId || null,
        p_submitted_code: submittedCode || null,
        p_status: 'correct',
        p_points_awarded: points,
      });
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (rpcErr) {
      // Fallback: insert submission and update participant score
      const { error: subErr } = await supabase.from('submissions').insert([
        {
          participant_id: participantId,
          question_id: questionId || null,
          submitted_code: submittedCode || null,
          status: 'correct',
          points_awarded: points,
        },
      ]);
      if (subErr) throw subErr;

      const { data: partData, error: partErr } = await supabase
        .from('participants')
        .select('score')
        .eq('id', participantId)
        .limit(1)
        .maybeSingle();
      let newScore = (partData?.score || 0) + points;
      if (partErr) {
        // attempt to still update
      }

      const { error: updErr } = await supabase.from('participants').update({ score: newScore }).eq('id', participantId);
      if (updErr) throw updErr;

      return res.json({ success: true, participant_id: participantId, new_score: newScore });
    }
  } catch (err) {
    console.error('submit error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Server listening on port ${port}`));
