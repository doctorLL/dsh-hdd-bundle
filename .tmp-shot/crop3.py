from PIL import Image
im=Image.open(r"E:\Code\Fairy-DSH-main\.tmp-shot\screen.png").convert("RGB")
print(im.size)
im.crop((2820,1330,4480,1603)).save(r"E:\Code\Fairy-DSH-main\.tmp-shot\composer.png")
im.crop((2200,60,4480,1400)).resize((1140,670),Image.LANCZOS).save(r"E:\Code\Fairy-DSH-main\.tmp-shot\content.png")
