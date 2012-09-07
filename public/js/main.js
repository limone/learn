// Hack some stuff into the String object
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.lastIndexOf(str, 0) === 0;
  }
}

window.learn = {};

// Show some messages
function displayMessage(msg) {
  $("#messages").html(msg);
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
      $('#entry').prop('disabled', true);
      displayMessage("Hold up - firing off that query for you!");
      socket.emit('sql', {'query':message});
    }

    return false;
  }
});

socket.on('output', function (data, is_err) {
  if (!is_err) {
    if (data.result.length === 0) {
      $("#output-data").html("<h1>results</h1><div><i class='icon-exclamation-sign icon-white'></i> No results for the provided query.</div>");
      return;
    }

    console.log("Has prev: " + data.hasPrev + " -- Has more: " + data.hasMore);

    // paging helper
    var paging = "<div class='row-fluid'>";
    if (data.hasPrev) {
      paging += "<div><a onclick='prevPage()'>Previous Page</a></div>";
    }

    if (data.hasMore) {
      paging += "<div class='pull-right'><a onclick='nextPage()'>Next Page</a></div>";
    }
    paging += "</div>";

    var rows = paging;
    $.each(data.result, function (idx, row) {
      if (idx > 100) {
        // fow now, break out after a bunch of rows
        return false;
      }

      rows += "<div class='row-fluid'>";
      $.each(row, function (cellName, cellValue) {
        rows += "<div class='span1'>";
        if (idx == 0) {
          rows +="<strong>" + cellName + "</strong>";
        } else {
          rows += cellValue;
        }
        rows += "</div>";
      });
      rows += "</div>";
    });

    rows += paging;

    $("#output-data").html("<h1>results</h1>" + rows);
  } else {
    $("#output-data").html("<h1>error</h1>" + "<p><i class='icon-warning-sign icon-white'></i> " + data + "</p>");
  }

  displayMessage("");
  $('#entry').prop('disabled', false);
});