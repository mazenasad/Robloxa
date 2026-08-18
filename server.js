local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- ========== إعدادات ==========
local DASHBOARD_URL = "https://robloxa.onrender.com"
local API_KEY = "my-secret-key-2026"
local HEARTBEAT_INTERVAL = 10

local LocalPlayer = Players.LocalPlayer
local isClient = LocalPlayer \~= nil

-- ========== دالة إرسال النبضة ==========
local function sendHeartbeat()
	local player = isClient and LocalPlayer or nil
	if not player and not isClient then
		-- لو سيرفر، هنبعت لكل لاعب لوحده
		return
	end

	local userId = isClient and tostring(LocalPlayer.UserId) or nil
	local username = isClient and LocalPlayer.Name or nil

	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = DASHBOARD_URL .. "/api/heartbeat",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-key"] = API_KEY
			},
			Body = HttpService:JSONEncode({
				userId = userId,
				username = username
			})
		})
	end)

	if success and response and response.Success then
		local data = HttpService:JSONDecode(response.Body)
		
		if data.kicked then
			local reason = data.reason or "تم طردك من قبل الأدمن"
			
			-- طريقة طرد قوية (تشتغل في الإكسكيوتر)
			if isClient then
				-- طريقة 1: طرد عادي
				pcall(function()
					LocalPlayer:Kick(reason)
				end)
				
				-- طريقة 2: لو الطرد العادي مقدرش (بعض الإكسكيوترز)
				task.wait(0.5)
				pcall(function()
					game:Shutdown()
				end)
				
				-- طريقة 3: كراش بسيط
				while true do end
			end
		end
	else
		warn("[Dashboard] Heartbeat failed")
	end
end

-- ========== تشغيل ==========
if isClient then
	-- نسخة Client (للإكسكيوتر)
	task.spawn(function()
		while true do
			sendHeartbeat()
			task.wait(HEARTBEAT_INTERVAL)
		end
	end)
	print("[Dashboard] Client script loaded")
else
	-- نسخة Server
	local function startForPlayer(player)
		task.spawn(function()
			while player and player.Parent do
				local success, response = pcall(function()
					return HttpService:RequestAsync({
						Url = DASHBOARD_URL .. "/api/heartbeat",
						Method = "POST",
						Headers = {
							["Content-Type"] = "application/json",
							["x-api-key"] = API_KEY
						},
						Body = HttpService:JSONEncode({
							userId = tostring(player.UserId),
							username = player.Name
						})
					})
				end)

				if success and response and response.Success then
					local data = HttpService:JSONDecode(response.Body)
					if data.kicked then
						player:Kick(data.reason or "تم طردك من قبل الأدمن")
					end
				end
				task.wait(HEARTBEAT_INTERVAL)
			end
		end)
	end

	Players.PlayerAdded:Connect(startForPlayer)
	for _, player in ipairs(Players:GetPlayers()) do
		startForPlayer(player)
	end
	print("[Dashboard] Server script loaded")
end  kicks[userId] = {
    reason: reason || "تم طردك من قبل الأدمن",
    permanent: permanent === true,
    expireAt: permanent ? null : now + (durationMinutes || 60) * 60 * 1000
  };

  // حذف من النشطين
  delete activeUsers[userId];

  res.json({ success: true });
});

// إلغاء الطرد
app.post('/api/unkick', checkAuth, (req, res) => {
  const { userId } = req.body;
  if (userId && kicks[userId]) {
    delete kicks[userId];
  }
  res.json({ success: true });
});

// صفحة اللوجين
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dashboard running on port ${PORT}`);
});
