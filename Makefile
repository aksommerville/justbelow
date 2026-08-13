all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $@" ; mkdir -p $(@D) ;

clean:;rm -rf mid out

run:;http-server -c-1 -p8080 src

#TODO Minify and bundle.
#TODO Serve minified app.
