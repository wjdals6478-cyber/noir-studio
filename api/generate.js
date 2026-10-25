export default async function handler(req, res) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: "FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다." });
  }

  const checkIsLocked = (status, data) => {
    const dataStr = JSON.stringify(data || {});
    return (
      status === 403 || 
      data?.code === 'TOP_UP' || 
      dataStr.includes('locked') || 
      dataStr.includes('TOP_UP')
    );
  };

  const lockedErrorResponse = {
    error: 'API_ACCOUNT_LOCKED',
    message: 'Fal.ai 크레딧이 부족하거나 계정이 잠겼습니다.'
  };

  try {
    // 1. GET 요청 (상태 폴링)
    if (req.method === 'GET') {
      const endpoint = req.query.endpoint;
      if (!endpoint) {
        return res.status(200).json({ status: "IN_PROGRESS" });
      }

      // 🛡️ [핵심 방어] 모델 주소로 잘못된 GET 폴링이 들어오면 405 대신 안전한 대기 상태 반환
      if (!endpoint.includes('/requests/') && !endpoint.startsWith('http')) {
        return res.status(200).json({ 
          status: "IN_PROGRESS", 
          message: "Waiting for request queue..." 
        });
      }

      const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json().catch(() => ({}));

      if (checkIsLocked(response.status, data)) {
        return res.status(200).json({ status: "FAILED", ...lockedErrorResponse });
      }

      return res.status(200).json(data);
    }

    // 2. POST 요청 (생성 요청 및 폴링 우회)
    if (req.method === 'POST') {
      const { endpoint, bodyData } = req.body;
      if (!endpoint) {
        return res.status(200).json({ error: "Endpoint is missing" });
      }

      const isPolling = endpoint.includes('/requests/') || endpoint.startsWith('http');

      if (isPolling) {
        const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Accept': 'application/json'
          }
        });
        const data = await response.json().catch(() => ({}));
        return res.status(200).json(data);
      }

      // 일반 생성 요청 (POST)
      const isQueueModel = endpoint.includes('minimax') || endpoint.includes('video') || endpoint.includes('queue');
      const baseUrl = isQueueModel ? 'https://queue.fal.run' : 'https://fal.run';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData || {})
      });

      const data = await response.json().catch(() => ({}));

      if (checkIsLocked(response.status, data)) {
        return res.status(403).json(lockedErrorResponse);
      }

      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    return res.status(200).json({ status: "IN_PROGRESS", error: err.message });
  }
}

