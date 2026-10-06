/*!
 * aside-calendar.js —— 侧栏「日历 · 打卡」卡
 * ==================================================================
 * 顶掉原来那张卡在 loading.gif 上的电子钟卡（electric_clock 已在配置里关掉），
 * 在 公告 和 网站资讯 之间插一张自己的卡：
 *
 *   第41周 周二   |  日 一 二 三 四 五 六
 *        06       |  ·  ·  ·  1  2  3  4
 *   2026年10月 第279天 |  5  6  7  8  9 10 11   ← 今天高亮，已打卡的日子填实心
 *   丙午马年 八月廿一 | 12 13 14 15 16 17 18
 *   ────────────────────────────────────────
 *   🔥 连续 3 天 · 本月 5 天 · 累计 12 天   [打卡]
 *
 * 打卡规则（仿洛谷）：只能打今天这一天；已打卡的日子在月历里是实心圆点，
 * 今天再点一次可以取消（方便点错了改回来）。未来日期灰掉不可点。
 *
 * 数据存在浏览器 localStorage 里（键 aside_checkin_v1，值是 {"2026-10-06":1}）。
 * 本站是 GitHub Pages 纯静态站，没有后端，所以打卡记录是「每台设备 / 每个浏览器」
 * 各存一份的：换浏览器、清缓存、无痕模式都会看不到之前的记录。想跨设备同步就得
 * 上后端（Waline / Twikoo / 自建 API），那是另一件事了。
 *
 * 依赖：/js/lunar.js 暴露的 solar2lunar()（有就显示农历，没有也能跑）
 * 样式：/css/aside-calendar.css
 * 挂载：_config.butterfly.yml 的 inject.bottom
 * 调试：控制台 asideCalendar.render()   手动重绘
 *       asideCalendar.state()           看打卡数据和连续天数
 *       asideCalendar.clear()           清空打卡记录
 */
(function () {
  'use strict'

  var CONFIG = {
    cardId: 'aside-calendar',
    weekCn: ['日', '一', '二', '三', '四', '五', '六'],
    gridStart: 0, // 月历第一列：0 = 从周日开始
    weekStart: 1, // 「第几周」按周一算
    storeKey: 'aside_checkin_v1',
    tickMs: 60000 // 每分钟重算一次，跨零点自动换日期
  }

  var DAY = 86400000

  function pad (n) { return (n < 10 ? '0' : '') + n }
  function dayKey (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function sod (d) { var x = new Date(d.getTime()); x.setHours(0, 0, 0, 0); return x }
  function daysInMonth (y, m) { return new Date(y, m, 0).getDate() } // m: 1-12
  function dayOfYear (d) { return Math.round((sod(d) - new Date(d.getFullYear(), 0, 1)) / DAY) + 1 }
  function weekNo (d) { // ISO 周数
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    t.setDate(t.getDate() - (t.getDay() + 6) % 7 + 3)
    var first = new Date(t.getFullYear(), 0, 4)
    first = new Date(t.getFullYear(), 0, 4 - (first.getDay() + 6) % 7 + 3)
    return 1 + Math.round((t - first) / (7 * DAY))
  }

  /* ---------------- 打卡数据 ---------------- */
  function load () {
    try { return JSON.parse(localStorage.getItem(CONFIG.storeKey)) || {} } catch (e) { return {} }
  }
  function save (days) {
    try { localStorage.setItem(CONFIG.storeKey, JSON.stringify(days)) } catch (e) {}
  }
  function isChecked (days, d) { return !!days[dayKey(d)] }
  function toggleToday () {
    var days = load(), k = dayKey(new Date())
    if (days[k]) delete days[k]; else days[k] = 1
    save(days)
    return !!days[k]
  }
  function countInMonth (days, now) {
    var p = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-', n = 0
    for (var k in days) { if (k.indexOf(p) === 0) n++ }
    return n
  }
  function countAll (days) { return Object.keys(days).length }
  function streak (days, now) { // 连续天数：今天没打就从昨天往前数
    var d = sod(now), n = 0
    if (!isChecked(days, d)) d = new Date(d.getTime() - DAY)
    while (isChecked(days, d)) { n++; d = new Date(d.getTime() - DAY) }
    return n
  }

  /* ---------------- 农历 ---------------- */
  function lunarText (now) {
    try {
      if (typeof window.solar2lunar !== 'function') return ''
      var l = window.solar2lunar(now.getFullYear(), now.getMonth() + 1, now.getDate())
      if (!l || !l.IMonthCn) return ''
      return (l.gzYear || '') + (l.Animal || '') + '年 ' + l.IMonthCn + l.IDayCn
    } catch (e) { return '' }
  }

  /* ---------------- 视图 ---------------- */
  function gridHtml (now, days) {
    var y = now.getFullYear(), m = now.getMonth() + 1, total = daysInMonth(y, m)
    var lead = (new Date(y, m - 1, 1).getDay() - CONFIG.gridStart + 7) % 7
    var html = '<div class="cal-grid">', i
    for (i = 0; i < 7; i++) html += '<span class="cal-hd">' + CONFIG.weekCn[(CONFIG.gridStart + i) % 7] + '</span>'
    for (i = 0; i < lead; i++) html += '<span class="cal-cell is-empty"></span>'
    for (i = 1; i <= total; i++) {
      var d = new Date(y, m - 1, i)
      var cls = 'cal-cell', tip = y + '年' + m + '月' + i + '日 星期' + CONFIG.weekCn[d.getDay()]
      var today = i === now.getDate()
      if (today) cls += ' is-today'
      if (isChecked(days, d)) {
        cls += ' is-checked'
        tip += today ? '（今天 · 已打卡，再点可取消）' : '（已打卡）'
      } else if (today) {
        cls += ' is-todo'
        tip += '（点一下打卡）'
      } else if (d > now) {
        cls += ' is-future'
        tip += '（还没到）'
      } else {
        tip += '（未打卡）'
      }
      html += '<span class="' + cls + '" title="' + tip + '"' + (today ? ' data-today="1" role="button" tabindex="0"' : '') + '>' + i + '</span>'
    }
    return html + '</div>'
  }

  function cardHtml (now, days) {
    var checked = isChecked(days, now)
    var lunar = lunarText(now)
    return '' +
      '<div class="item-headline"><i class="fas fa-calendar-days"></i><span>日历 · 打卡</span></div>' +
      '<div class="cal-main">' +
        '<div class="cal-left">' +
          '<div class="cal-week">第' + weekNo(now) + '周 ' + '周' + CONFIG.weekCn[now.getDay()] + '</div>' +
          '<div class="cal-daynum">' + pad(now.getDate()) + '</div>' +
          '<div class="cal-solar">' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月 第' + dayOfYear(now) + '天</div>' +
          (lunar ? '<div class="cal-lunar">' + lunar + '</div>' : '') +
        '</div>' +
        gridHtml(now, days) +
      '</div>' +
      '<div class="cal-foot">' +
        '<span class="cal-stats">🔥 连续 <b>' + streak(days, now) + '</b> 天 · 本月 <b>' + countInMonth(days, now) + '</b> 天 · 累计 <b>' + countAll(days) + '</b> 天</span>' +
        '<button type="button" class="cal-btn' + (checked ? ' is-on' : '') + '" data-today="1">' +
          (checked ? '<i class="fas fa-check"></i> 已打卡' : '打卡') +
        '</button>' +
      '</div>'
  }

  /* ---------------- 挂载 / 渲染 ---------------- */
  function mount () {
    var card = document.getElementById(CONFIG.cardId)
    if (card) return card
    var sticky = document.querySelector('#aside-content .sticky_layout') || document.querySelector('.sticky_layout')
    card = document.createElement('div')
    card.className = 'card-widget card-calendar'
    card.id = CONFIG.cardId
    if (sticky) {
      sticky.insertBefore(card, sticky.firstChild) // 落在 公告 之后、网站资讯 之前
      return card
    }
    var ann = document.querySelector('#aside-content .card-announcement')
    if (ann && ann.parentElement) {
      ann.parentElement.insertBefore(card, ann.nextSibling)
      return card
    }
    return null
  }

  function onClick (e) {
    var el = e.target.closest ? e.target.closest('[data-today]') : null
    if (!el) return
    var on = toggleToday()
    render()
    if (el.classList && el.classList.contains('cal-cell')) {
      var fresh = document.querySelector('#' + CONFIG.cardId + ' [data-today].cal-cell')
      if (fresh) fresh.blur()
    }
    return on
  }

  function render () {
    var card = mount()
    if (!card) return false
    var now = new Date()
    card.innerHTML = cardHtml(now, load())
    if (!card.dataset.bound) {
      card.addEventListener('click', onClick)
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') onClick(e)
      })
      card.dataset.bound = '1'
    }
    return true
  }

  function boot () {
    render()
    if (!window.__asideCalendarTimer) {
      window.__asideCalendarTimer = setInterval(function () {
        if (document.visibilityState !== 'hidden') render()
      }, CONFIG.tickMs)
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'hidden') render()
      })
      ;['pjax:complete', 'pjax:success', 'pjax:end'].forEach(function (ev) {
        document.addEventListener(ev, render)
      })
    }
  }

  window.asideCalendar = {
    config: CONFIG,
    render: render,
    state: function () {
      var days = load()
      return { days: days, today: dayKey(new Date()), streak: streak(days, new Date()), month: countInMonth(days, new Date()), total: countAll(days) }
    },
    clear: function () { save({}); return render() }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
