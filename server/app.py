try:
    from PIL import Image
except ImportError:
    import Image
import pytesseract
from flask import Flask, request, url_for, jsonify, make_response, send_file, render_template
from flask.logging import default_handler
from flask_cors import CORS
import os
import io
import logging
import subprocess
import tempfile
import random
import time
from pdf2image import convert_from_path, convert_from_bytes
import subprocess
from celery import Celery

app = Flask(
    __name__
)
app.config['TMP_FOLDER'] = './tmp'
CORS(app)


logger = app.logger
app.config.update(
    CELERY_BROKER_URL='redis://redis:6379/0',
    CELERY_RESULT_BACKEND='redis://redis:6379/0'
)

def make_celery(app):
    celery = Celery(app.import_name, backend=app.config['CELERY_RESULT_BACKEND'],
                    broker=app.config['CELERY_BROKER_URL'])
    celery.conf.update(app.config)
    TaskBase = celery.Task
    class ContextTask(TaskBase):
        abstract = True
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return TaskBase.__call__(self, *args, **kwargs)
    celery.Task = ContextTask
    return celery


celery = make_celery(app)

def empty_tmp():
    temp_files = os.listdir('./tmp')
    for file in temp_files:
        filepath = os.path.join('./tmp', file)
        os.remove(filepath)

@celery.task()
def process_hocr_pdf(savepath, bind=True):
    def convert_png(png):
        ocr_output = pytesseract.image_to_pdf_or_hocr(png, extension='pdf')
        with open(png + '.pdf', 'wb') as f:
            f.write(ocr_output)
            return png + '.pdf'

    with open(savepath, 'rb') as inputfile:
        basename = os.path.basename(savepath)
        filename, filetype = os.path.splitext(basename)
        logger.info('processing file ' + savepath)

        with tempfile.TemporaryDirectory() as path:
            pngs = convert_from_bytes(inputfile.read(), dpi=300, output_folder=path)
            pdfs = []
            for i, png in enumerate(pngs):
                png_filename = filename + '_' + str(i + 1) + '.png'
                png.save(os.path.join(path, png_filename))
                pdfs.append(convert_png(os.path.join(path, png_filename)))
            outputfilename = filename + '_hocr.pdf'
            subprocess.call(['pdftk'] + [pdf for pdf in pdfs] + ['cat', 'output', os.path.join('./tmp', outputfilename)])
            logger.info('processed file ' + outputfilename)
            return { 'output': outputfilename }


@app.route('/split_pdf', methods=['POST'])
def split_pdf():
    if 'file' not in request.files:
        print('No file was provided\n')
        return 'No file was provided.', 400

    inputfile = request.files['file']
    filename, filetype = os.path.splitext(inputfile.filename)
    page_arg = request.args.get('pages')

    with tempfile.TemporaryDirectory() as path:
        savepath = os.path.join(path, inputfile.filename)
        inputfile.save(savepath)
        pages = ['A' + page for page in page_arg.split(',')]
        outputfile = os.path.join(path, filename + '_' + page_arg + '.pdf')
        subprocess.call(['pdftk', 'A=' + savepath, 'cat'] + pages + ['output', outputfile])
        with open(outputfile, 'rb') as data:
            resp = io.BytesIO(data.read())
            return send_file(
                resp,
                attachment_filename=filename,
                mimetype='application/pdf'
            )


@app.route('/hocr_pdf', methods=['POST'])
def make_rich_pdf():
    if 'file' not in request.files:
        print('No file was provided\n')
        return 'No file was provided.', 400

    inputfile = request.files['file']
    savepath = os.path.join('./tmp', inputfile.filename)
    inputfile.save(savepath)
    task = process_hocr_pdf.apply_async(args=[savepath])
    return jsonify({'task': url_for('taskstatus',
                                                  task_id=task.id)}), 202

@app.route('/status/<task_id>')
def taskstatus(task_id):
    task = process_hocr_pdf.AsyncResult(task_id)
    if task.status == 'SUCCESS':
        return jsonify({
            'status': task.status,
            'info': task.info
        })
    else:
        return jsonify({ 'status': task.status })

@app.route('/processed_files/<filename>')
def taskfile(filename):
    logger.info('getting task file')
    data = open(os.path.join('./tmp', filename), 'rb')
    if data:
        resp = io.BytesIO(data.read())
        empty_tmp()
        return send_file(
            resp,
            attachment_filename=filename,
            mimetype='application/pdf'
        )
    else:
        return 'No file was found.', 400


if __name__ != '__main__':
    # If this module started using gunicorn, consolidate logs into one stream for convenience
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)