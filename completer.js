window.runQuestCompleter = function(targetGuildId, inviteCode) {
    const modalId = "quest-custom-modal";
    const miniWidgetId = "quest-mini-widget";
    const styleId = "quest-bot-styles";

    [modalId, miniWidgetId, styleId].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        @keyframes qbFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes qbPulse { 0% { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(88, 101, 242, 0); } 100% { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0); } }
        .qb-btn { transition: all 0.2s ease; font-family: 'gg sans', 'Noto Sans', sans-serif; }
        .qb-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .qb-btn:active:not(:disabled) { transform: translateY(0); }
        .qb-scroll::-webkit-scrollbar { width: 6px; }
        .qb-scroll::-webkit-scrollbar-thumb { background: #1e1f22; border-radius: 3px; }
    `;
    document.head.appendChild(style);

    let wpRequire, QuestsStore, ChannelStore, api;
    try {
        delete window.$;
        wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
        webpackChunkdiscord_app.pop();
        const modules = Object.values(wpRequire.c);
        QuestsStore = modules.find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
        ChannelStore = modules.find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports?.A;
        api = modules.find(x => x?.exports?.Bo?.get)?.exports?.Bo;
    } catch (e) {
        console.error("Quest Bot: Module extraction failed", e);
    }

    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
    let quests = [];
    if (QuestsStore?.quests) {
        quests = [...QuestsStore.quests.values()].filter(x => 
            x.userStatus?.enrolledAt && 
            !x.userStatus?.completedAt && 
            new Date(x.config.expiresAt).getTime() > Date.now() && 
            supportedTasks.some(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2)?.tasks ?? {}).includes(y))
        );
    }

    let isVerified = false;
    try {
        if (api) {
            api.get({ url: '/users/@me/guilds' }).then(guildsRes => {
                if (guildsRes?.body?.some(g => g.id === targetGuildId)) {
                    isVerified = true;
                }
            });
        }
    } catch (e) {}

    let isAborted = false;

    const overlay = document.createElement("div");
    overlay.id = modalId;
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px);
        z-index: 999999; display: flex; justify-content: center; align-items: center;
        font-family: 'gg sans', 'Noto Sans', sans-serif;
    `;

    const questListHTML = quests.length > 0 
        ? quests.map(q => {
            const name = q.config.messages?.questName ?? "Unknown Quest";
            const tConfig = q.config.taskConfig ?? q.config.taskConfigV2;
            const task = supportedTasks.find(t => tConfig?.tasks?.[t] != null) || "TASK";
            return `<div style="background: #2b2d31; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span style="color: #f2f3f5; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${name}</span>
                <span style="background: #5865F233; color: #949cf7; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${task.replace(/_/g, ' ')}</span>
            </div>`;
        }).join('')
        : `<div style="color: #f2f3f43; font-size: 13px; padding: 10px; background: #f23f431a; border-radius: 6px;">සක්‍රීය Quests කිසිවක් හමු නොවීය!</div>`;

    const box = document.createElement("div");
    box.style.cssText = `
        background: #313338; color: #f2f3f5; padding: 24px; border-radius: 16px;
        width: 440px; box-shadow: 0 12px 32px rgba(0,0,0,0.65); border: 1px solid #3f4147;
        position: relative; animation: qbFadeIn 0.25s ease-out;
    `;

    box.innerHTML = `
        <div style="position: absolute; top: 14px; right: 16px; display: flex; gap: 8px;">
            <button id="minimize-modal-btn" title="Minimize" style="background: #2b2d31; border: 1px solid #3f4147; color: #b5bac1; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">&#8211;</button>
            <button id="kill-modal-btn" title="Close" style="background: #2b2d31; border: 1px solid #3f4147; color: #f23f43; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #5865F2, #4752c4); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">⚡</div>
            <div>
                <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #fff;">Discord Quest Auto-Completer</h2>
                <span style="font-size: 12px; color: #949ba4;">${quests.length} Active Quest(s) Found</span>
            </div>
        </div>
        <div class="qb-scroll" style="max-height: 120px; overflow-y: auto; margin-bottom: 16px; padding-right: 2px;">
            ${questListHTML}
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <a href="https://discord.gg/${inviteCode}" target="_blank" id="join-btn" class="qb-btn" style="flex: 1; background: #5865F2; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; text-align: center;">1. Join Server</a>
            <button id="verify-btn" class="qb-btn" style="flex: 1; background: #4e5058; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">2. Verify Server</button>
        </div>
        <button id="start-quest-btn" class="qb-btn" style="background: linear-gradient(90deg, #248046, #1a6334); color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; margin-bottom: 14px;">
            🚀 Start Completing Quests
        </button>
        <div style="background: #1e1f22; border-radius: 8px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span id="status-msg" style="color: #f0b232; font-weight: 600;">පළමුව Server එකට Join වී Verify කරන්න.</span>
                <span id="modal-percent" style="color: #b5bac1; font-weight: bold;">0%</span>
            </div>
            <div style="width: 100%; height: 8px; background: #2b2d31; border-radius: 4px; overflow: hidden;">
                <div id="modal-progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #5865F2, #23a55a); transition: width 0.4s ease;"></div>
            </div>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const miniWidget = document.createElement("div");
    miniWidget.id = miniWidgetId;
    miniWidget.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: rgba(30, 31, 34, 0.95);
        backdrop-filter: blur(8px); color: white; padding: 10px 16px; border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6); z-index: 999998; display: none;
        flex-direction: column; gap: 6px; cursor: pointer; min-width: 220px;
        border: 1px solid #5865F2; font-family: 'gg sans', 'Noto Sans', sans-serif;
        animation: qbPulse 2s infinite;
    `;
    miniWidget.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700;">
            <span>Quest Bot: Ready</span>
            <span id="mini-percent" style="color: #949cf7;">0%</span>
        </div>
        <div style="width: 100%; height: 5px; background: #2b2d31; border-radius: 3px; overflow: hidden;">
            <div id="mini-progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #5865F2, #23a55a);"></div>
        </div>
    `;
    document.body.appendChild(miniWidget);

    document.getElementById("minimize-modal-btn").onclick = () => { overlay.style.display = "none"; miniWidget.style.display = "flex"; };
    miniWidget.onclick = () => { miniWidget.style.display = "none"; overlay.style.display = "flex"; };
    document.getElementById("kill-modal-btn").onclick = () => { isAborted = true; overlay.remove(); miniWidget.remove(); style.remove(); };

    document.getElementById("verify-btn").onclick = async () => {
        document.getElementById("status-msg").innerText = "තහවුරු කිරීම සාර්ථකයි! Start ඔබන්න.";
        document.getElementById("verify-btn").innerText = "✓ Verified";
        document.getElementById("verify-btn").style.background = "#248046";
    };

    document.getElementById("start-quest-btn").onclick = () => {
        if (quests.length === 0) return;
        
        const sleep = ms => new RegExp().compile ? new Promise(res => setTimeout(res, ms)) : new Promise(res => setTimeout(res, ms));
        let qList = [...quests];

        const runNext = async () => {
            if (isAborted) return;
            let q = qList.pop();
            if (!q) {
                document.getElementById("status-msg").innerText = "🎉 සියලුම Quests සම්පූර්ණයි!";
                return;
            }
            
            let tConfig = q.config.taskConfig ?? q.config.taskConfigV2;
            let tName = supportedTasks.find(x => tConfig?.tasks?.[x] != null);
            if (!tName) return runNext();

            let targetSec = tConfig.tasks[tName].target;
            let doneSec = q.userStatus?.progress?.[tName]?.value ?? 0;

            while(doneSec < targetSec && !isAborted) {
                await new Promise(r => setTimeout(r, 5000));
                doneSec = Math.min(targetSec, doneSec + 10);
                let pct = Math.floor((doneSec / targetSec) * 100);
                document.getElementById("status-msg").innerText = `Progress: ${doneSec}/${targetSec}s`;
                document.getElementById("modal-percent").innerText = pct + "%";
                document.getElementById("modal-progress-fill").style.width = pct + "%";
                
                try {
                    await api.post({ url: `/quests/${q.id}/video-progress`, body: { timestamp: doneSec } });
                } catch(e){}
            }
            runNext();
        };
        runNext();
    };
};
console.log("📦 Quest Completer Library Loaded!");
