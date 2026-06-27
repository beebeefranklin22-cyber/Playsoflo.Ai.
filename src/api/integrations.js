import { supabase } from '@/lib/supabaseClient';

export async function UploadFile({ file, bucket = 'media', path: customPath } = {}) {
  if (!file) throw new Error('No file provided');
  const ext = file.name?.split('.').pop() ?? 'bin';
  const fileName = customPath ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function InvokeLLM({ prompt, systemPrompt = "You are Ronron AI, the helpful assistant for PlaySoFlo.", response_json_schema, model } = {}) {
  const res = await fetch('/api/ronron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt, response_json_schema, model }),
  });
  if (!res.ok) throw new Error(`InvokeLLM failed: ${res.status}`);
  const { result, parsed } = await res.json();
  return parsed ?? result;
}

export async function SendEmail({ to, subject, body, from } = {}) {
  const res = await fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, from }),
  });
  if (!res.ok) throw new Error(`SendEmail failed: ${res.statusText}`);
  return res.json();
}

export async function SendSMS({ to, message } = {}) {
  const res = await fetch('/api/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  });
  if (!res.ok) throw new Error(`SendSMS failed: ${res.statusText}`);
  return res.json();
}

export async function GenerateImage({ prompt, width = 1024, height = 1024, model } = {}) {
  const res = await fetch('/api/imagine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, model }),
  });
  if (!res.ok) throw new Error(`GenerateImage failed: ${res.statusText}`);
  const { url } = await res.json();
  return url;
}

export async function ExtractDataFromUploadedFile({ file_url, json_schema } = {}) {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_url, json_schema }),
  });
  if (!res.ok) throw new Error(`Extract failed: ${res.statusText}`);
  return res.json();
}

export const Core = { UploadFile, InvokeLLM, SendEmail, SendSMS, GenerateImage, ExtractDataFromUploadedFile };
