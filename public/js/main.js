var socket = io.connect('http://localhost:9090');
$(document).ready(function()
{
  $('#terminal-entry').show();
  $('#entry').focus();
});

$('#entry').on('keypress', function(event) {
    if(event.which == 13) {
        event.preventDefault();
        var message = $('#entry').val();
        $('#entry').val('');
        socket.emit('sql', message);
        return false;
    }
});

socket.on('sql-output', function(data) {
    var headers = "<tr>";
    var rows = "";

    $.each(data, function(idx, row) {
        rows += "<tr>";
        $.each(row, function (cellName, cellValue) {
           if (idx == 0) {
               headers += "<th>" + cellName + "</th>";
           }
           rows += "<td>" + cellValue + "</td>";
        });
        rows += "</tr>";
    });

    headers += "</tr>";

    $("#sql-data").html("<table>" + headers + rows + "</table>");
});