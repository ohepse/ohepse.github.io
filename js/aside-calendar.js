/*!
 * aside-calendar.js —— 侧栏「日历 · 打卡」卡
 * ==================================================================
 * 顶掉原来那张卡在 loading.gif 上的电子钟卡（electric_clock 已在配置里关掉），
 * 在 公告 和 网站资讯 之间插一张自己的卡：
 *
 *   第41周 周二   |  日 一 二 三 四 五 六
 *        06       |  ·  ·  ·  1  2  3  4
 *   2026年10月 第279天 |  5  6  7  8  9 10 11   ← 今天高亮，已打卡的日子填实心
 *   丙午马年 八月廿六 | 12 13 14 15 16 17 18
 *   ────────────────────────────────────────
 *   🔥 连续 3 天 · 本月 5 天 · 累计 12 天   [✓ 已打卡]
 *   ────────────────────────────────────────
 *   今日运势
 *         大吉
 *     宜            忌
 *   刷题            熬夜
 *   成为做题家       爆肝
 *   你已连续打卡 3 天
 *
 * 打卡规则（仿洛谷）：一天只能打一次，打完按钮就 disabled，不能取消、不能重复点。
 * 打卡后会给出当天的运势 + 宜/忌（数据表和分档逻辑照搬 E:\pre-colax\洛谷老黄历.py）。
 * 运势按「日期」做种子，所以同一天无论刷新多少次、换哪台设备，结果都一样；
 * 第二天自动换一份新的。
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
 *       asideCalendar.fortune()        看今天这份运势的全部数字
 *       asideCalendar.state()          看打卡数据和连续天数
 *       asideCalendar.clear()          清空打卡记录（打卡按钮锁住后，只能靠它重置）
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
  var WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

  /* ---------------- 老黄历数据（照搬 洛谷老黄历.py） ---------------- */
  var FORTUNE = ['宇宙超级凶', '大凶', '中凶', '小凶', '小平', '中平', '小吉', '中吉', '大吉', '超级吉']

  // 下标 1-39，[0] 占位
  var THING = [null,
    '万事皆宜', '万事皆宜', '诸事不宜', '诸事不宜',
    '写作文', '搞基', '扶老奶奶过马路', '开电脑', '刷题',
    '重构代码', '写作业', '参加模拟赛', '睡觉', '打minesweeper',
    '祭祀', '膜拜大神', '洗澡', '继续完成WA的题', '熬夜',
    '泡妹子', '考试', '背诵课文', '体育锻炼', '吃饭',
    '上课', '装蒟蒻', '学习珂学', '纳财', '上B站',
    '发朋友圈', '装逼', '打网游', '打sdvx', '出行',
    '学习数学', '摆烂', '约会', '打15P', '精苏']

  // 下标 5-39（前 5 个是空的）
  var LUCK = ['', '', '', '', '',
    '非常有文采', '友谊天长地久', 'RP++', '电脑状态也很好', '成为做题家',
    '代码质量明显提高', '都会写，写的都对', '可以AK虐全场', '养足精神，明日再战', '打爆JZE',
    '获得祖先庇护', '接受神犇光环照耀', '你多久没洗澡了？', '下一次就可以AC', '事情终究是可以完成的',
    '说不定可以牵手', '学的全会，蒙的全对', '看一遍就背下来了', '身体棒棒的', '人是铁饭是钢',
    '100%消化', '谦虚最好了', '珂朵莉太可爱了！', '要收到好多money', '愉悦身心',
    '分享是种美德', '获得众人敬仰', '犹如神助', '您爆了', '一路顺风',
    '灵感爆棚', '反正事情都能做完', '能更近一步', 'TPS 30+', '来到了苏慈祖的时代']

  var UNLUCK = ['', '', '', '', '',
    '一定会偏题', '会被掰弯', '会被讹', '意外的死机事故', '不是WA就是TLE',
    '越改越乱', '上课讲这些了吗', '注意爆零', '翻来覆去睡不着', '第二下就踩到雷',
    '祖宗不知道干啥就不鸟你', '被大神鄙视', '当心着凉', '然而变成了TLE', '爆肝',
    '一定会被拒绝', '作弊会被抓', '记忆力只有50Byte', '消耗的能量全吃回来了', '小心变胖啊',
    '反正你听不懂', '被看穿', '珂朵莉和奈芙莲都不理你', '然而今天没有财运', '会被教练发现',
    '会被当做买面膜的', '被识破', '匹配到一群猪队友', '今天状态不好', '路途必然坎坷',
    '这是啥啊', '会被同学批', '吵架了', '降层越降越乱', '苏穗宗和苏勋宗执政']

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
  function checkIn (d) { // 只加不减：一天只能打一次
    var days = load(), k = dayKey(d)
    if (days[k]) return false
    days[k] = 1
    save(days)
    return true
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

  /* ---------------- 每日运势（按日期做种子，同一天结果固定） ---------------- */
  function seedRand (seed) { // mulberry32
    var t = seed >>> 0
    return function () {
      t = (t + 0x6D2B79F5) >>> 0
      var r = Math.imul(t ^ (t >>> 15), 1 | t)
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }
  function luckLevel (n) { // 照搬 py 的 rdluck()
    if (n === 1) return 0
    if (n <= 6) return 1
    if (n <= 15) return 2
    if (n <= 30) return 3
    if (n <= 50) return 4
    if (n <= 70) return 5
    if (n <= 85) return 6
    if (n <= 93) return 7
    if (n <= 99) return 8
    return 9
  }
  function pick (rand) { return 5 + Math.floor(rand() * 35) } // 5-39
  function fortuneOf (now) {
    var rand = seedRand(now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate())
    var r = 1 + Math.floor(rand() * 100) // 1-100
    var lv = luckLevel(r)
    var r1 = pick(rand), r2 = pick(rand)
    while (r2 === r1) r2 = pick(rand)
    var r3 = pick(rand), r4 = pick(rand)
    while (r4 === r3) r4 = pick(rand)
    var good = [{ t: THING[r1], d: LUCK[r1] }, { t: THING[r2], d: LUCK[r2] }]
    var bad = [{ t: THING[r3], d: UNLUCK[r3] }, { t: THING[r4], d: UNLUCK[r4] }]
    if (lv >= 8) good = [{ t: THING[1], d: '' }] // 大吉/超级吉：万事皆宜
    if (lv <= 1) bad = [{ t: THING[4], d: '' }] // 凶：诸事不宜
    return { r: r, lv: lv, name: FORTUNE[lv], good: good, bad: bad }
  }
  function fortuneHtml (now) {
    var f = fortuneOf(now)
    var lvCls = f.lv <= 3 ? 'lv' + Math.min(f.lv, 1) : (f.lv <= 6 ? 'lv2' : 'lv3')
    var col = function (cls, head, list) {
      return '<div class="cal-ft-col ' + cls + '"><div class="cal-ft-h">' + head + '</div>' +
        list.map(function (it) {
          return '<div class="cal-ft-item">' + it.t + (it.d ? '<i>' + it.d + '</i>' : '') + '</div>'
        }).join('') + '</div>'
    }
    return '<div class="cal-fortune">' +
      '<div class="cal-ft-title">今日运势</div>' +
      '<div class="cal-ft-level ' + lvCls + '">' + f.name + '</div>' +
      '<div class="cal-ft-cols">' + col('good', '宜', f.good) + col('bad', '忌', f.bad) + '</div>' +
      '<div class="cal-ft-foot">你已连续打卡 ' + streak(load(), now) + ' 天</div>' +
      '</div>'
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
      var cls = 'cal-cell', tip = y + '年' + m + '月' + i + '日 星期' + WEEK_CN[d.getDay()]
      var today = i === now.getDate()
      if (today) cls += ' is-today'
      if (isChecked(days, d)) {
        cls += ' is-checked'
        tip += today ? '（今天 · 已打卡）' : '（已打卡）'
      } else if (today) {
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
          '<div class="cal-week">第' + weekNo(now) + '周 ' + '周' + WEEK_CN[now.getDay()] + '</div>' +
          '<div class="cal-daynum">' + pad(now.getDate()) + '</div>' +
          '<div class="cal-solar">' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月 第' + dayOfYear(now) + '天</div>' +
          (lunar ? '<div class="cal-lunar">' + lunar + '</div>' : '') +
        '</div>' +
        gridHtml(now, days) +
      '</div>' +
      '<div class="cal-foot">' +
        '<span class="cal-stats">🔥 连续 <b>' + streak(days, now) + '</b> 天 · 本月 <b>' + countInMonth(days, now) + '</b> 天 · 累计 <b>' + countAll(days) + '</b> 天</span>' +
        (checked
          ? '<button type="button" class="cal-btn is-on" disabled><i class="fas fa-check"></i> 已打卡</button>'
          : '<button type="button" class="cal-btn" data-today="1">打卡</button>') +
      '</div>' +
      (checked ? fortuneHtml(now) : '')
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
    if (!el || el.disabled) return
    if (isChecked(load(), new Date())) return // 已打卡：按钮/今天都不再响应
    if (checkIn(new Date())) render()
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
    fortune: function (d) { return fortuneOf(d || new Date()) },
    state: function () {
      var days = load()
      return { days: days, today: dayKey(new Date()), checkedToday: isChecked(days, new Date()), streak: streak(days, new Date()), month: countInMonth(days, new Date()), total: countAll(days) }
    },
    clear: function () { save({}); return render() }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
