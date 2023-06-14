let data = [[0.29, 87], [2.5, 45], [4.5, 103], [3.5, 323]];

let options = {
  chart: {
    height: 350,
    type: "scatter",
    zoom: {
      enabled: true,
      type: "xy"
    }
  },

  series: [
    {
      name: "Datos chilos",
      data: data
    }
  ],
  xaxis: {
    tickAmount: 10,
    labels: {
      formatter: function(val) {
        return parseFloat(val).toFixed(1);
      }
    }
  },
  yaxis: {
    tickAmount: 7
  }
};

var chart = new ApexCharts(document.querySelector("#grafica"), options);

chart.render();
