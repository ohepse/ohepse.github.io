setInterval(() => {
  let create_time = Math.round(new Date('2023-04-02 00:00:00').getTime() / 1000); //在此行修改建站时间
  let timestamp = Math.round((new Date().getTime()) / 1000);
  let second = timestamp - create_time;
  let time = new Array(0, 0, 0, 0, 0);
  //格式规范化，个位数前面加0
  var nol = function(h){
    return h>9?h:'0'+h;
  }
  if (second >= 365 * 24 * 3600) {
    time[0] = parseInt(second / (365 * 24 * 3600));
    second %= 365 * 24 * 3600;
  }//年
  if (second >= 24 * 3600) {
    time[1] = parseInt(second / (24 * 3600));
    second %= 24 * 3600;
  }//天
  if (second >= 3600) {
    time[2] = nol(parseInt(second / 3600));
    second %= 3600;
  }//时
  if (second >= 60) {
    time[3] = nol(parseInt(second / 60));
    second %= 60;
  }//分
  if (second > 0) {
    time[4] = nol(second);
  }//秒
  //早上7点到晚上10点营业
  if ((Number(time[2])<22) && (Number(time[2])>7)){
    currentTimeHtml ="<img class='boardsign' src='https://img.shields.io/badge/%F0%9F%8C%9EohEPse%E7%9A%84%E5%B0%8F%E7%AB%99-%E4%B8%8A%E8%AF%BE%E6%91%B8%E9%B1%BCing%F0%9F%91%A9%E2%80%8D%F0%9F%92%BB-6adea8?style=social' title='( ￣▽￣)((≧︶≦)'><div id='runtime'>" + time[0] + ' YEAR ' + time[1] + ' DAYS ' + time[2] + ' : ' + time[3] + ' : ' + time[4] + '</div>';
  } //徽标内容参考站内教程
  //其余时间打烊
  else{
    currentTimeHtml ="<img class='boardsign' src='https://img.shields.io/badge/%F0%9F%8C%9CohEPse%E7%9A%84%E5%B0%8F%E7%AB%99-%E5%9B%9E%E5%AE%B6%E8%A1%A5%E8%A7%89ing%F0%9F%9B%8C-6adea8?style=social' title='(‘-ωก')><div id='runtime'>" + time[0] + ' YEAR ' + time[1] + ' DAYS ' + time[2] + ' : ' + time[3] + ' : ' + time[4] + '</div>'; //徽标内容参考站内教程
  }
  //覆写挂载标签的内容
  document.getElementById("workboard").innerHTML = currentTimeHtml;
}, 1000);