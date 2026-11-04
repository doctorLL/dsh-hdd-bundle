from PIL import Image
src=r"C:\Users\super\.dsh\attachments\v1\objects\7a\7a1acb2034e1826445a2eed9c274befcdd7e539c37377ff1f644b047f92e1e30"
im=Image.open(src).convert("RGB")
print(im.size)
im.resize((im.width*2, im.height*2), Image.LANCZOS).save(r"E:\Code\Fairy-DSH-main\.tmp-shot\full2x.png")
