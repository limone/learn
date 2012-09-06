// Hack some stuff into the String object
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.lastIndexOf(str, 0) === 0;
  }
}

var socket = io.connect(document.location.href);

$(document).ready(function () {
  $('#terminal-entry').show();
  $('#entry').focus();
});

$('#entry').on('keypress', function (event) {
  if (event.which == 13) {
    event.preventDefault();
    var message = new String($('#entry').val());

    if (message.startsWith("help")) {
      $('#output-data').html("<h1>help</h1><p><i class='icon-question-sign icon-white'></i> Currently available functionality: </p><p><blockquote>* any SQL query you can think of<br/>*\\l - list tables<br/>*\\d &lt;table name&gt; - describe a table</blockquote></p>");
    } else if (message.startsWith("\\d")) {
      socket.emit('describe', message);
    } else if (message.startsWith("\\l")) {
      socket.emit('list');
    } else if (message.toLowerCase() === 'clear') {
      $('#output-data').html('');
    } else {
      socket.emit('sql', {'query':message});
      return false;
    }
  }
});

socket.on('output', function (data, is_err) {
  if (!is_err) {
    var headers = "<tr>";
    var rows = "";

    if (data.length === 0) {
      $("#output-data").html("<h1>results</h1><div><i class='icon-exclamation-sign icon-white'></i> No results for the provided query.</div>");
      return;
    }

    $.each(data, function (idx, row) {
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

    $("#output-data").html("<h1>results</h1><table>" + headers + rows + "</table>");
  } else {
    $("#output-data").html("<h1>error</h1>" + "<p><i class='icon-warning-sign icon-white'></i> " + data + "</p>");
  }
});